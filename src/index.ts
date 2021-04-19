import fs from "fs";
import {config} from "@chainsafe/lodestar-config/mainnet";
import {
  getBeaconStateStream,
  getFinalizedCheckpointEventStream,
  getWSEpoch,
  IPFSApiClient,
  nodeIsSynced,
} from "./api";
import {BeaconEventType} from "./types";
import {verifyArgs} from "./utils";
import {Epoch} from "@chainsafe/lodestar-types";
import {CID_FILE_PATH} from "./constants";

async function uploadStateOnFinalized(): Promise<void> {
  const eventSource = getFinalizedCheckpointEventStream();
  const waitingMsg = "Waiting for finalized checkpoints...";
  
  console.log(waitingMsg);

  let alreadyFetchingState = false;
  // TODO: fix `any`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventSource.addEventListener(BeaconEventType.FINALIZED_CHECKPOINT, async (evt: any) => {
    console.log(`Incoming finalized checkpoint at epoch ${evt.data.epoch}`);

    if (!alreadyFetchingState) {
      alreadyFetchingState = true;
      const wsEpoch = await getWSEpoch();
      
      let storedWSEpoch = 0;
      if (fs.existsSync(CID_FILE_PATH)) {
        const CID = fs.readFileSync(CID_FILE_PATH, "utf-8").split("\n")[0]!;
        console.log(CID);
        storedWSEpoch = await ipfsApiClient.getIPFSWSEpoch(CID);
      }

      console.log("Stored ws epoch: ", storedWSEpoch);
      console.log("Fetched ws epoch: ", wsEpoch);

      if (wsEpoch > storedWSEpoch) {
        console.log(`Getting state for weak subjectivity epoch ${wsEpoch}...`);
        const state = await getBeaconStateStream(config, wsEpoch);
        console.log(`Found state for weak subjectivity epoch ${wsEpoch}`);
        await uploadState(state, wsEpoch);
      }
      alreadyFetchingState = false;
      console.log(waitingMsg);
    }
  });
}

async function uploadState(state: NodeJS.ReadableStream, wsEpoch: Epoch): Promise<void> {
  // upload state to ipfs
  console.log("Uploading to IPFS...");
  const cid = await ipfsApiClient.uploadToIPFS(state, wsEpoch);
  if (cid === undefined) throw new Error("Missing response from IPFS");

  // publish to ipns
  console.log("Publishing to IPNS...");
  const ipnsResp = await ipfsApiClient.publishToIPNS(cid);
  console.log("Done publishing!");
  console.log(ipnsResp);

  // store IPFS hash (CID) in local file
  fs.writeFileSync(CID_FILE_PATH, cid, "utf-8");
}

async function main(): Promise<void> {
  ipfsApiClient = new IPFSApiClient();
  verifyArgs();
  // @TODO ? we could also get config params via getSpec(), if needed
  await nodeIsSynced(config.params);
  try {
    await uploadStateOnFinalized();
  } catch (e) {
    console.error(e.message);
  }
}

let ipfsApiClient: IPFSApiClient;

main();

import fs from "fs";
import {config} from "@chainsafe/lodestar-config/mainnet";
import {
  getBeaconStateStream,
  getFinalizedCheckpointEventStream,
  getIPFSWSEpoch,
  getWSEpoch,
  nodeIsSynced,
  publishToIPNS,
  uploadToIPFS
} from "./api";
import {BeaconEventType} from "./types";
import {verifyArgs} from "./utils";
import {Epoch} from "@chainsafe/lodestar-types";
import {CID_FILE_PATH} from "./constants";

async function uploadStateOnFinalized(): Promise<void> {
  const eventSource = getFinalizedCheckpointEventStream();
  console.log("Waiting for finalized checkpoints...");

  let alreadyFetchingState = false;
  // TODO: fix `any`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventSource.addEventListener(BeaconEventType.FINALIZED_CHECKPOINT, async (evt: any) => {
    const checkpoint = config.types.phase0.FinalizedCheckpoint.fromJson(JSON.parse(evt.data));
    console.log(`Incoming finalized checkpoint at epoch ${checkpoint.epoch}`);

    if (!alreadyFetchingState) {
      alreadyFetchingState = true;
      const wsEpoch = await getWSEpoch();
      
      let storedWSEpoch = 0;
      if (fs.existsSync(CID_FILE_PATH)) {
        const CID = fs.readFileSync(CID_FILE_PATH, "utf-8").split("\n")[0]!;
        console.log(CID);
        storedWSEpoch = await getIPFSWSEpoch(CID);
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
    }
  });
}

async function uploadState(state: NodeJS.ReadableStream, wsEpoch: Epoch): Promise<void> {
  // upload state to ipfs
  console.log("Uploading to IPFS...");
  const ipfsResp = await uploadToIPFS(state, wsEpoch);

  // publish to ipns
  console.log("Publishing to IPNS...");
  const ipnsResp = await publishToIPNS(ipfsResp.Hash);
  console.log("Done publishing!");
  console.log(ipnsResp);

  // store IPFS hash in local file
  fs.writeFileSync(CID_FILE_PATH, ipfsResp.Hash, "utf-8");
}

async function main(): Promise<void> {
  verifyArgs();
  // @TODO ? we could also get config params via getSpec(), if needed
  await nodeIsSynced(config.params);
  try {
    await uploadStateOnFinalized();
  } catch (e) {
    console.error(e.message);
  }
}

main();

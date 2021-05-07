import fs from "fs";
import {config} from "@chainsafe/lodestar-config/mainnet";
import {
  getBeaconStateBuffer,
  getFinalizedCheckpointEventStream,
  getWSEpoch,
  IPFSApiClient,
  nodeIsSynced,
} from "./api";
import {BeaconEventType} from "./types";
import {verifyArgs} from "./utils";
import {Epoch} from "@chainsafe/lodestar-types";
import {CID_FILE_PATH, WS_STATE_DATA_FILE_PATH} from "./constants";
import {toHexString} from "@chainsafe/ssz";

let alreadyFetchingState = false;

async function getAndUploadState(wsEpoch: Epoch): Promise<void> {
  console.log(`Getting state for weak subjectivity epoch ${wsEpoch}...`);
  let state;
  try {
    state = await getBeaconStateBuffer(config, wsEpoch);
  } catch (error) {
    throw new Error(
      `State retrieval/storage error for weak subjectivity epoch ${wsEpoch}.  Retrying.  Reason: ${error.message}`
    );
  }
  if (!state) throw new Error(`State at weak subjectivity epoch ${wsEpoch} not found`);
  console.log(`Found state for weak subjectivity epoch ${wsEpoch}`);

  const cid = await uploadState(state, wsEpoch);

  const stateRoot = toHexString(
    config.types.phase0.BeaconState.hashTreeRoot(config.types.phase0.BeaconState.deserialize(state))
  );
  const stateData = {stateRoot, ipfsPath: "/ipfs/" + cid + "/state.ssz"};

  // store stateData locally
  fs.writeFileSync(WS_STATE_DATA_FILE_PATH, JSON.stringify(stateData, null, 2), "utf-8");
  
  // store IPFS hash (CID) in local file
  fs.writeFileSync(CID_FILE_PATH, cid, "utf-8");

  console.log("Waiting for finalized checkpoints...");
  alreadyFetchingState = false;
}

async function uploadStateOnFinalized(): Promise<void> {
  const eventSource = getFinalizedCheckpointEventStream();
  
  console.log("Waiting for finalized checkpoints...");

  // TODO: fix `any`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventSource.addEventListener(BeaconEventType.FINALIZED_CHECKPOINT, async (evt: any) => {
    console.log(`Incoming finalized checkpoint at epoch ${JSON.parse(evt.data).epoch}`);

    if (!alreadyFetchingState) {
      const wsEpoch = await getWSEpoch();
      
      let storedWSEpoch = -1;
      if (fs.existsSync(CID_FILE_PATH)) {
        const CID = fs.readFileSync(CID_FILE_PATH, "utf-8").split("\n")[0]!;
        console.log(`Found locally stored IPFS CID at ${CID_FILE_PATH}: ${CID}`);
        storedWSEpoch = await ipfsApiClient.getIPFSWSEpoch(CID);
      }

      console.log("Weak subjectivty epoch from IPNS: ", storedWSEpoch);
      console.log("Weak subjectivty epoch from beacon node: ", wsEpoch);

      if (wsEpoch > storedWSEpoch) {
        alreadyFetchingState = true;
        try {
          await getAndUploadState(wsEpoch);
        } catch (error) {
          console.error(error.message);
          setTimeout(async () => await getAndUploadState(wsEpoch), 5000);
        }
      }
    }
  });
}

async function uploadState(state: Buffer, wsEpoch: Epoch): Promise<string> {
  // upload state to ipfs
  console.log(`Uploading state at weak subjectivity epoch ${wsEpoch} to IPFS...`);
  const cid = await ipfsApiClient.uploadToIPFS(state, wsEpoch);
  if (cid === undefined) throw new Error(`Missing response from IPFS for weak subjectivity ${wsEpoch}`);

  // publish to ipns
  console.log(`Publishing state at weak subjectivity epoch ${wsEpoch} to IPNS...`);
  const ipnsResp = await ipfsApiClient.publishToIPNS(cid);
  console.log(`Done publishing state at weak subjectivity epoch ${wsEpoch}!`);
  console.log(ipnsResp);

  return cid;
}

async function main(): Promise<void> {
  ipfsApiClient = new IPFSApiClient();
  verifyArgs();
  try {
    // @TODO ? we could also get config params via getSpec(), if needed
    await nodeIsSynced(config.params);
    await uploadStateOnFinalized();
  } catch (e) {
    console.error(e.message);
  }
}

let ipfsApiClient: IPFSApiClient;

main();

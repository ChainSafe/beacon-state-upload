import fs from "fs";
import {config} from "@chainsafe/lodestar-config/mainnet";
import {
  getBeaconState,
  getFinalizedCheckpointEventStream,
  getIPFSCheckpointEpoch,
  getWSEpoch,
  nodeIsSynced,
  publishToIPNS,
  uploadToIPFS
} from "./api";
import {BeaconEventType} from "./types";
import {verifyArgs} from "./utils";
import {phase0} from "@chainsafe/lodestar-types";
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
      
      let storedCheckpointEpoch = 0;
      if (fs.existsSync(CID_FILE_PATH)) {
        const CID = fs.readFileSync(CID_FILE_PATH, "utf-8").split("\n")[0]!;
        console.log(CID);
        storedCheckpointEpoch = await getIPFSCheckpointEpoch(CID);
      }

      if (wsEpoch > storedCheckpointEpoch) {
        console.log(`Getting state for weak subjectivity epoch ${wsEpoch}...`);
        const state = await getBeaconState(config, wsEpoch);
        console.log(`Found state for weak subjectivity epoch ${wsEpoch}`);
        await uploadState(state);
      }
      alreadyFetchingState = false;
    }
  });
}

async function uploadState(state: phase0.BeaconState): Promise<void> {
  // upload state to ipfs
  console.log("Uploading to IPFS...");
  const ipfsResp = await uploadToIPFS(state);

  // publish to ipns
  console.log("Publish to IPNS...");
  const ipnsResp = await publishToIPNS(ipfsResp.Hash);
  console.log("Done publishing!");
  
  console.log(ipnsResp);
  fs.writeFileSync(CID_FILE_PATH, JSON.stringify(ipnsResp), "utf-8");
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

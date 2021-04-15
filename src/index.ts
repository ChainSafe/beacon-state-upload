import {config} from "@chainsafe/lodestar-config/mainnet";
import {phase0} from "@chainsafe/lodestar-types";
import {
  getBeaconState,
  getFinalizedCheckpointEventStream,
  getWSEpoch,
  nodeIsSynced,
  publishToIPNS,
  uploadToIPFS
} from "./api";
import {BeaconEventType} from "./types";
import {verifyArgs} from "./utils";

async function uploadStateOnFinalized(): Promise<void> {
  const eventSource = getFinalizedCheckpointEventStream();
  console.log("Waiting for finalized checkpoints...");

  let alreadyFetchingState = false;
  // TODO: fix `any`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventSource.addEventListener(BeaconEventType.FINALIZED_CHECKPOINT, async (evt: any) => {
    const checkpoint = config.types.phase0.FinalizedCheckpoint.fromJson(JSON.parse(evt.data));
    console.log("Incoming finalized checkpoint: ", checkpoint);
  
    const wsEpoch = await getWSEpoch();
    // @TODO this value is a placeholder.  need to get value from IPFS
    const storedEpoch = 0;
    if (wsEpoch > storedEpoch && !alreadyFetchingState) {
      alreadyFetchingState = true;
      console.log("Getting state...");
      const state = await getBeaconState(config, wsEpoch);
      console.log(`Found state for wsEpoch ${wsEpoch}`);
      console.log("Uploading state...");
      await uploadState(state);
      alreadyFetchingState = false;
    }
  });
}

async function uploadState(state: phase0.BeaconState): Promise<void> {
  // upload state to ipfs
  console.log("Uploading to ipfs");
  const ipfsResp = await uploadToIPFS(config, state);

  // publish to ipns
  console.log("Publish to ipns");
  const ipnsResp = await publishToIPNS(ipfsResp.Hash);
  console.log(ipnsResp);
}

// async function saveState() {
//   try {
//     // request head finality checkpoints
//     console.log("Fetching latest finalized checkpoint");
//     const checkpoint = await getLatestFinalizedCheckpoint();
//     console.log("Finalized checkpoint", checkpoint);

//     // request finalized state
//     console.log("Fetching finalized beacon state");
//     const stateStream = await getBeaconStateStream(config, Number(checkpoint.epoch));

//     uploadState(checkpoint, stateStream);
//   } catch (e) {
//     console.error(e.message);
//   }
// }


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

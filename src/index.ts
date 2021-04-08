import {config} from "@chainsafe/lodestar-config/mainnet";
import { getBeaconStateStream, getFinalizedCheckpointEventStream, getLatestFinalizedCheckpoint, getWSEpoch, nodeIsSynced, publishToIPNS, uploadToIPFS } from "./api";
import { BeaconEventType } from "./types";
import { verifyArgs } from "./utils";

async function uploadStateOnFinalized() {
  const eventSource = getFinalizedCheckpointEventStream();
  // TODO: fix `any`
  eventSource.addEventListener(BeaconEventType.FINALIZED_CHECKPOINT, async (evt: any) => {
    const checkpoint = config.types.phase0.FinalizedCheckpoint.fromJson(JSON.parse(evt.data));
    console.log("Incoming finalized checkpoint: ", checkpoint);
    const wsEpoch = await getWSEpoch();
    if (wsEpoch > checkpoint.epoch) {
      // request the state at that epoch, using the debug getState api
      
      // TODO: probably use Epoch param type instead of string?
      const stateStream = await getBeaconStateStream(checkpoint.epoch.toString());
      
      // and store the state using the existing code to store to IPFS
    }
  });
}

async function saveState() {
  try {
    // request head finality checkpoints
    console.log("Fetching latest finalized checkpoint");
    const checkpoint = await getLatestFinalizedCheckpoint();
    console.log("Finalized checkpoint", checkpoint);

    // request finalized state
    console.log("Fetching finalized beacon state");
    const stateStream = await getBeaconStateStream(checkpoint.epoch);

    // upload state to ipfs
    console.log("Uploading to ipfs")
    const ipfsResp = await uploadToIPFS(checkpoint, stateStream);

    // publish to ipns
    console.log("Publish to ipns")
    const ipnsResp = await publishToIPNS(ipfsResp.Hash);
    console.log(ipnsResp);
  } catch (e) {
    console.error(e.message);
  }
}


async function main() {
  verifyArgs();
  // we could also get config params via getSpec(), if needed
  // const synced = await nodeIsSynced(config.params);
  try {
    // if (synced) await uploadStateOnFinalized();
    await uploadStateOnFinalized();
  } catch (e) {
    console.error(e.mesage);
  }
}

main();

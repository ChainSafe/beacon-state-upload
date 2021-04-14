import {phase0} from "@chainsafe/lodestar-types";

export enum BeaconEventType {
  FINALIZED_CHECKPOINT = "finalized_checkpoint",
  // BLOCK = "block",
}

// export type BeaconBlockEvent = {
//   type: typeof BeaconEventType.BLOCK;
//   message: phase0.BlockEventPayload;
// };

export type FinalizedCheckpointEvent = {
  type: typeof BeaconEventType.FINALIZED_CHECKPOINT;
  message: phase0.FinalizedCheckpoint;
};

export interface Checkpoint {
  epoch: string;
  root: string;
}

export interface IPFSAddResponse {
  Hash: string;
  Name: string;
  Size: string;
}

export interface IPFSPublishIPNSResponse {
  Name: string;
  Value: string;
}
import EventSource from "eventsource";
import {IBeaconParams} from "@chainsafe/lodestar-params";
import fetch from "node-fetch";
import {
  BEACON_URL,
  CONFIG_SPEC_PATH,
  EVENT_STREAM_PATH,
  HEAD_FINALITY_CHECKPOINTS_PATH,
  NODE_SYNCED_PATH,
  STATE_PATH,
  WS_EPOCH_PATH
} from "../constants";
import {BeaconEventType, Checkpoint} from "../types";
import {urlJoin} from "../utils";
import {Epoch} from "@chainsafe/lodestar-types";
import {IBeaconConfig} from "@chainsafe/lodestar-config";

export async function getSpec(): Promise<IBeaconParams> {
  const resp = await fetch(BEACON_URL + CONFIG_SPEC_PATH);
  if (resp.status !== 200) {
    throw new Error("Unable to get spec");
  }
  const respJson = await resp.json();
  return respJson;
}

export async function nodeIsSynced(configParams: IBeaconParams): Promise<boolean> {
  const resp = await fetch(BEACON_URL + NODE_SYNCED_PATH);
  if (resp.status !== 200) {
    throw new Error("Unable to fetch node sync status");
  }
  const respJson = await resp.json();
  if (respJson.data.sync_distance > configParams.SLOTS_PER_EPOCH) {
    throw new Error(`Node is syncing ${JSON.stringify(respJson.data)}`);
  }
  return true;
}

export async function getWSEpoch(): Promise<Epoch> {
  const resp = await fetch(BEACON_URL + WS_EPOCH_PATH);
  if (resp.status !== 200) {
    throw new Error("Unable to fetch ws epoch");
  }
  const epoch = await resp.json();
  return epoch;
}

export function getFinalizedCheckpointEventStream(): EventSource {
  return new EventSource(
    urlJoin(BEACON_URL, EVENT_STREAM_PATH + "topics=" + BeaconEventType.FINALIZED_CHECKPOINT)
  );
}

export async function getLatestFinalizedCheckpoint(): Promise<Checkpoint> {
  const resp = await fetch(BEACON_URL + HEAD_FINALITY_CHECKPOINTS_PATH);
  if (resp.status !== 200) {
    throw new Error("Unable to fetch checkpoint");
  }
  const respJson = await resp.json();
  return respJson.data.finalized;
}

export async function getBeaconStateBuffer(config: IBeaconConfig, epoch: Epoch): Promise<Buffer> {
  const slot = epoch * config.params.SLOTS_PER_EPOCH;
  const resp = await fetch(BEACON_URL + STATE_PATH + slot, {
    headers: {
      Accept: "application/octet-stream",
    },
  });
  if (resp.status !== 200) {
    throw new Error(`Error fetching getBeaconStateBuffer: ${JSON.stringify(await resp.json())}`);
  }
  return await resp.buffer();
}

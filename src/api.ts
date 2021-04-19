import EventSource from "eventsource";
import {IBeaconParams} from "@chainsafe/lodestar-params";
import fetch from "node-fetch";
import FormData from "form-data";
import {
  ADD_FILE_PATH,
  BEACON_URL,
  CONFIG_SPEC_PATH,
  EVENT_STREAM_PATH,
  HEAD_FINALITY_CHECKPOINTS_PATH,
  IPFS_URL,
  NODE_SYNCED_PATH,
  PUBLISH_IPNS_PATH,
  STATE_PATH,
  WS_EPOCH_PATH
} from "./constants";
import {BeaconEventType, Checkpoint, IPFSAddResponse, IPFSPublishIPNSResponse} from "./types";
import {urlJoin} from "./utils";
import {Epoch, phase0} from "@chainsafe/lodestar-types";
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
    throw new Error(`Node is syncing ${respJson}`);
  }
  return true;
}

export async function getWSEpoch(): Promise<Epoch> {
  const resp = await fetch(BEACON_URL + WS_EPOCH_PATH);
  if (resp.status !== 200) {
    throw new Error("Unable to fetch node sync status");
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

export async function getBeaconState(config: IBeaconConfig, epoch: Epoch): Promise<phase0.BeaconState> {
  const slot = epoch * config.params.SLOTS_PER_EPOCH;
  const resp = await fetch(BEACON_URL + STATE_PATH + slot);
  if (resp.status !== 200) {
    throw new Error(`Can't fetch beacon state: ${await resp.text()}`);
  }
  const state = (await resp.json()).data;
  return state;
}

export async function getBeaconStateStream(config: IBeaconConfig, epoch: Epoch): Promise<NodeJS.ReadableStream> {
  const slot = epoch * config.params.SLOTS_PER_EPOCH;
  const resp = await fetch(BEACON_URL + STATE_PATH + slot, {
    headers: {
      Accept: "application/octet-stream",
    },
  });
  if (resp.status !== 200) {
    throw new Error(`Error fetching getBeaconStateStream: ${await resp.text()}`);
  }
  return resp.body;
}

export async function uploadToIPFS(state: phase0.BeaconState, wsEpoch: Epoch): Promise<IPFSAddResponse> {
  const formData = new FormData();

  // store checkpoint and state as a directory
  formData.append("file", "", {contentType: "application/x-directory", filename: "folderName"});
  // TODO: fix `any` and/or get camelcase json
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData.append("file", wsEpoch, "folderName%2FwsEpoch.json");
  formData.append("file", Buffer.from(JSON.stringify(state)), "folderName%2Fstate.ssz");
  const resp = await fetch(IPFS_URL + ADD_FILE_PATH, {
    method: "POST",
    body: formData,
  });
  if (resp.status !== 200) {
    throw new Error("Unable to upload to IPFS");
  }
  // response is JSON-LD, pop off last entry (the directory containing checkpoint & state)
  return JSON.parse((await resp.text()).trim().split("\n").pop()!);
}

export async function publishToIPNS(hash: string, lifetimeHrs = 24): Promise<IPFSPublishIPNSResponse> {
  const resp = await fetch(IPFS_URL + PUBLISH_IPNS_PATH + `?arg=${hash}&lifetime=${lifetimeHrs}h`, {
    method: "POST"
  });
  if (resp.status !== 200) {
    throw new Error("Unable to publish to IPNS");
  }
  return await resp.json();
}

export async function getIPFSWSEpoch(CID: string): Promise<number> {
  const url = IPFS_URL + `/api/v0/cat?arg=/ipfs/${CID}/wsEpoch.json`;
  console.log("url: ", url);
  const resp = await fetch(url, {
    method: "POST"
  });
  return Number((await resp.json()));
}
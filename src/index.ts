import fetch from "node-fetch";
import FormData = require("form-data");

let BEACON_URL = process.argv[2] || process.env.BEACON_URL || "http://localhost:9597";
let IPFS_URL = process.argv[3] || process.env.IPFS_URL || "http://localhost:5001";

const HEAD_FINALITY_CHECKPOINTS_PATH = "/eth/v1/beacon/states/head/finality_checkpoints";
const STATE_PATH = "/eth/v1/debug/beacon/states/";
const ADD_FILE_PATH = "/api/v0/add";
const PUBLISH_IPNS_PATH = "/api/v0/name/publish";
const SLOTS_PER_EPOCH = 32;


interface Checkpoint {
  epoch: string;
  root: string;
}

interface IPFSAddResponse {
  Hash: string;
  Name: string;
  Size: string;
}

interface IPFSPublishIPNSResponse {
  Name: string;
  Value: string;
}

function verifyVariables(): void {
  if (!/^(http|https):\/\/[^ "]+$/.test(BEACON_URL)) {
    throw new Error(`Invalid url for beacon chain url: ${BEACON_URL}`);
  }
  if (!/^(http|https):\/\/[^ "]+$/.test(IPFS_URL)) {
    throw new Error(`Invalid url for IPFS url: ${IPFS_URL}`);
  }
}

async function getLatestFinalizedCheckpoint(): Promise<Checkpoint> {
  const resp = await fetch(BEACON_URL + HEAD_FINALITY_CHECKPOINTS_PATH);
  if (resp.status !== 200) {
    throw new Error("Unable to fetch checkpoint");
  }
  const respJson = await resp.json();
  return respJson.data.finalized;
}

async function getBeaconStateStream(checkpoint: Checkpoint): Promise<NodeJS.ReadableStream> {
  const slot = Number(checkpoint.epoch) * SLOTS_PER_EPOCH;
  const resp = await fetch(BEACON_URL + STATE_PATH + "head", {
    headers: {
      Accept: "application/octet-stream",
    },
  });
  if (resp.status !== 200) {
    throw new Error("Unable to fetch state");
  }
  return resp.body;
}

async function uploadToIPFS(checkpoint: Checkpoint, stateStream: NodeJS.ReadableStream): Promise<IPFSAddResponse> {
  const formData = new FormData();
  // store checkpoint and state as a directory
  formData.append("file", "", {contentType: "application/x-directory", filename: "folderName"});
  formData.append("file", JSON.stringify(checkpoint), "folderName%2Fcheckpoint.json");
  formData.append("file", stateStream, "folderName%2Fstate.ssz");
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

async function publishToIPNS(hash: string, lifetimeHrs = 24): Promise<IPFSPublishIPNSResponse> {
  const resp = await fetch(IPFS_URL + PUBLISH_IPNS_PATH + `?arg=${hash}&lifetime=${lifetimeHrs}h`, {
    method: "POST"
  });
  if (resp.status !== 200) {
    throw new Error("Unable to publish to IPNS");
  }
  return await resp.json();
}

async function saveState() {
  try {
    // Verify passed in arguments
    verifyVariables();

    // request head finality checkpoints
    console.log("Fetching latest finalized checkpoint");
    const checkpoint = await getLatestFinalizedCheckpoint();
    console.log("Finalized checkpoint", checkpoint);

    // request finalized state
    console.log("Fetching finalized beacon state");
    const stateStream = await getBeaconStateStream(checkpoint);

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

saveState();

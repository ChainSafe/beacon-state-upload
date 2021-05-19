export const BEACON_URL = process.argv[2] ?? process.env.BEACON_URL ?? "http://localhost:9596";
export const IPFS_URL = process.argv[3] ?? process.env.IPFS_URL ?? "http://localhost:5001";
export const ROOT_DIR = process.argv[4] ?? process.env.IPFS_URL ?? "./";

export const CID_FILE_PATH = ROOT_DIR + ".cid";
export const WS_STATE_DATA_FILE_PATH = ROOT_DIR + "weakSubjectivityState.json";

export const ETH_API_PREFIX = "/eth/v1";
export const CONFIG_SPEC_PATH = ETH_API_PREFIX + "/config/spec";
export const NODE_SYNCED_PATH = ETH_API_PREFIX + "/node/syncing";
export const EVENT_STREAM_PATH = ETH_API_PREFIX + "/events?";
export const HEAD_FINALITY_CHECKPOINTS_PATH = ETH_API_PREFIX + "/beacon/states/head/finality_checkpoints";
export const STATE_PATH = ETH_API_PREFIX + "/debug/beacon/states/";
export const WS_EPOCH_PATH = ETH_API_PREFIX + "/lodestar/ws_epoch/";
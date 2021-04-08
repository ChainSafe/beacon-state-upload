import { BEACON_URL, IPFS_URL } from "./constants";

// copied from @chainsafe/lodestar-validator
export function urlJoin(...args: string[]): string {
  return (
    args
      .join("/")
      .replace(/([^:]\/)\/+/g, "$1")
      // Remove duplicate slashes in the front
      .replace(/^(\/)+/, "/")
  );
}

export function verifyArgs(): void {
  if (!/^(http|https):\/\/[^ "]+$/.test(BEACON_URL)) {
    throw new Error(`Invalid url for beacon chain url: ${BEACON_URL}`);
  }
  if (!/^(http|https):\/\/[^ "]+$/.test(IPFS_URL)) {
    throw new Error(`Invalid url for IPFS url: ${IPFS_URL}`);
  }
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipfsClient = require("ipfs-http-client");
import {IPFSPublishIPNSResponse} from "../types";
import {Epoch} from "@chainsafe/lodestar-types";

export class IPFSApiClient {
  private client;

  constructor() {
    // connect to the default IPFS API address http://localhost:5001
    this.client = ipfsClient();
  }

  async uploadToIPFS(state: Buffer, wsEpoch: Epoch): Promise<string | undefined> {
    const dirName = "tmp";
    const files = [
      {
        path: `/${dirName}/wsEpoch.json`,
        content: JSON.stringify(wsEpoch),
      },
      {
        path: `/${dirName}/state.ssz`,
        content: state,
      }
    ];
  
    try {
      const data = this.client.addAll(files);
      for await (const result of data) {
        console.log("File added to IPFS: ", result);
        // return the container directory for the two files
        if (result.path === dirName) return result.cid.toString();
      }
    } catch (error) {
      throw new Error(`Unable to upload to IPFS: ${error}`);      
    }
  }
  
  async publishToIPNS(hash: string, lifetime = "24h"): Promise<IPFSPublishIPNSResponse> {
    try {
      const resp = await this.client.name.publish(hash, {lifetime});
      return resp;
    } catch (error) {
      throw new Error(`Unable to upload to IPNS: ${error}`);
    }
  }
  
  async getIPFSWSEpoch(CID: string): Promise<number> {
    try {
      const resp = this.client.cat(`/ipfs/${CID}/wsEpoch.json`);
      return Number((await resp[Symbol.asyncIterator]().next()).value.toString());
    } catch (error) {
      throw new Error("Can't get WS Epoch from IPFS");
    }
  }
}
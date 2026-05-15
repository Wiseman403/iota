import { IotaClient } from "@iota/iota-sdk/client";
import { TESTNET_RPC } from "../config";

export const client = new IotaClient({ url: TESTNET_RPC });
import { requestIotaFromFaucetV0 } from "@iota/iota-sdk/faucet";
import { FAUCET_URL } from "../config";

export async function fund(address: string): Promise<void> {
  await requestIotaFromFaucetV0({
    host: FAUCET_URL,
    recipient: address,
  });
}
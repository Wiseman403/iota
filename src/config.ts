// Reads VITE_* env vars from .env.local and fails loudly if any are missing.

function required(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Check that .env.local exists at the project root and contains it.`,
    );
  }
  return value;
}

export const PACKAGE_ID = required("VITE_PACKAGE_ID");
export const SENSOR_HUB_ID = required("VITE_SENSOR_HUB_ID");
export const TESTNET_RPC = required("VITE_TESTNET_RPC");
export const FAUCET_URL = required("VITE_FAUCET_URL");
export const DEPLOYER_ADDRESS = required("VITE_DEPLOYER_ADDRESS");

export const EXPLORER_BASE = "https://explorer.iota.org";
export const NETWORK = "testnet" as const;

export function explorerTxUrl(digest: string): string {
  return `${EXPLORER_BASE}/txblock/${digest}?network=${NETWORK}`;
}

export function explorerObjectUrl(id: string): string {
  return `${EXPLORER_BASE}/object/${id}?network=${NETWORK}`;
}
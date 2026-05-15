import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";

const STORAGE_KEY = "sensor-dapp:secret-key";

/** Generate a brand-new keypair. */
export function generateKeypair(): Ed25519Keypair {
  return Ed25519Keypair.generate();
}

/** Derive a keypair from a 12-word recovery phrase (BIP39 mnemonic). */
export function fromMnemonic(mnemonic: string): Ed25519Keypair {
  return Ed25519Keypair.deriveKeypair(mnemonic.trim());
}

/** Persist the keypair's secret key to localStorage (prototype-grade). */
export function saveKeypair(kp: Ed25519Keypair): void {
  const secretKey = kp.getSecretKey();
  localStorage.setItem(STORAGE_KEY, secretKey);
}

/** Load the keypair from localStorage, or null if there isn't one. */
export function loadKeypair(): Ed25519Keypair | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return Ed25519Keypair.fromSecretKey(raw);
  } catch (err) {
    console.error("Failed to load keypair from storage:", err);
    return null;
  }
}

export function clearKeypair(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Convenience: get the public address as a 0x-prefixed hex string. */
export function addressOf(kp: Ed25519Keypair): string {
  return kp.toIotaAddress();
}
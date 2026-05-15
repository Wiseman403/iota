/**
 * Gas tracker — accumulates the actual on-chain gas cost of every successful
 * transaction in localStorage. Survives page reloads. Both QuickSendCard and
 * AutoGenerator call recordGasFromEffects(...) after a successful send.
 *
 * Net cost per tx (NANOS) = computationCost + storageCost - storageRebate
 *                           + nonRefundableStorageFee
 *
 * The hook in useGasTracker.ts subscribes to a custom DOM event so the
 * StatsCard re-renders the moment a transaction lands.
 */

const STORAGE_KEY = "sensor-dapp:gas-tracker";
const EVENT_NAME = "sensor-dapp:gas-tracker-update";

export interface GasTotal {
  /** Total NANOS spent across all tracked transactions, as a string (BigInt safe). */
  totalNanos: string;
  /** Number of transactions counted. */
  txCount: number;
}

interface GasUsedFields {
  computationCost?: string | null;
  storageCost?: string | null;
  storageRebate?: string | null;
  nonRefundableStorageFee?: string | null;
}

interface TxEffects {
  gasUsed?: GasUsedFields | null;
}

const ZERO: GasTotal = { totalNanos: "0", txCount: 0 };

export function getGasTotal(): GasTotal {
  if (typeof window === "undefined") return ZERO;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return ZERO;
  try {
    const parsed = JSON.parse(raw) as GasTotal;
    if (typeof parsed.totalNanos === "string" && typeof parsed.txCount === "number") {
      return parsed;
    }
    return ZERO;
  } catch {
    return ZERO;
  }
}

/**
 * Read effects.gasUsed from a signAndSend response and add the cost
 * to the running total. Safe to call with `null` or `undefined` — does nothing.
 */
export function recordGasFromEffects(
  effects: TxEffects | null | undefined,
): void {
  if (!effects?.gasUsed) return;
  const {
    computationCost,
    storageCost,
    storageRebate,
    nonRefundableStorageFee,
  } = effects.gasUsed;

  const used =
    BigInt(computationCost ?? "0") +
    BigInt(storageCost ?? "0") -
    BigInt(storageRebate ?? "0") +
    BigInt(nonRefundableStorageFee ?? "0");

  const current = getGasTotal();
  const next: GasTotal = {
    totalNanos: (BigInt(current.totalNanos) + used).toString(),
    txCount: current.txCount + 1,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function resetGasTotal(): void {
  localStorage.removeItem(STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export const GAS_TRACKER_EVENT = EVENT_NAME;
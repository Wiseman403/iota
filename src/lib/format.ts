/** Truncate a long hex ID to 0xabcd…ef01 (8 chars + ellipsis + 4 chars). */
export function shortId(id: string): string {
  if (!id) return "";
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

/** Convert NANOS (1e9 NANOS = 1 IOTA) to IOTA, formatted to 4 decimals. */
export function nanosToIota(nanos: bigint | string | number): string {
  const n = typeof nanos === "bigint" ? nanos : BigInt(nanos);
  const whole = n / 1_000_000_000n;
  const frac = n % 1_000_000_000n;
  // pad frac to 9 digits, then trim to 4
  const fracStr = frac.toString().padStart(9, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}
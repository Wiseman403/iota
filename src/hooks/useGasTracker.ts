import { useEffect, useState } from "react";
import {
  getGasTotal,
  type GasTotal,
  GAS_TRACKER_EVENT,
} from "../lib/gasTracker";

/**
 * Reactive gas tracker. Re-renders whenever the StatsCard, QuickSendCard,
 * or AutoGenerator records a successful transaction. Listens to a custom
 * window event dispatched by lib/gasTracker.ts.
 */
export function useGasTracker(): GasTotal {
  const [total, setTotal] = useState<GasTotal>(getGasTotal);

  useEffect(() => {
    const update = () => setTotal(getGasTotal());
    window.addEventListener(GAS_TRACKER_EVENT, update);
    return () => window.removeEventListener(GAS_TRACKER_EVENT, update);
  }, []);

  return total;
}
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Hash,
  Thermometer,
  Droplets,
  Fuel,
  RotateCcw,
} from "lucide-react";
import { useSensorHub } from "../hooks/useSensorHub";
import { useGasTracker } from "../hooks/useGasTracker";
import { useReadingStats } from "../hooks/useReadingStats";
import { resetGasTotal } from "../lib/gasTracker";
import { nanosToIota } from "../lib/format";

interface Props {
  address: string | null;
  highTempThreshold?: number;
}

export function StatsCard({ address, highTempThreshold = 30 }: Props) {
  const hubQuery = useSensorHub();
  const stats = useReadingStats(address, highTempThreshold);
  const gas = useGasTracker();
  const [confirming, setConfirming] = useState(false);

  function handleResetGas() {
    if (!confirming) {
      setConfirming(true);
      // Auto-revert if the user doesn't confirm within 4 seconds.
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    resetGasTotal();
    setConfirming(false);
    toast.success("Gas tracker reset.");
  }

  const hubReadings = hubQuery.isLoading
    ? "…"
    : hubQuery.error
    ? "—"
    : hubQuery.data?.readingsRecorded ?? "—";

  return (
    <section className="rounded-2xl bg-white shadow p-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-5">
        <Stat
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Hub readings"
          value={hubReadings}
          hint="across all writers"
          accent="emerald"
        />
        <Stat
          icon={<Hash className="w-3.5 h-3.5" />}
          label="Your readings"
          value={stats.count.toString()}
          hint={
            stats.highTempCount > 0
              ? `${stats.highTempCount} ≥ ${highTempThreshold} °C`
              : "in your wallet"
          }
          accent="slate"
        />
        <Stat
          icon={<Thermometer className="w-3.5 h-3.5" />}
          label="Avg temperature"
          value={
            stats.avgTemperature !== null
              ? `${stats.avgTemperature.toFixed(1)} °C`
              : "—"
          }
          hint={
            stats.minTemperature !== null && stats.maxTemperature !== null
              ? `${stats.minTemperature}–${stats.maxTemperature} °C range`
              : "no data"
          }
          accent="rose"
        />
        <Stat
          icon={<Droplets className="w-3.5 h-3.5" />}
          label="Avg humidity"
          value={
            stats.avgHumidity !== null
              ? `${stats.avgHumidity.toFixed(0)} %`
              : "—"
          }
          hint={stats.count > 0 ? `${stats.count} samples` : "no data"}
          accent="sky"
        />
        <Stat
          icon={<Fuel className="w-3.5 h-3.5" />}
          label="Gas spent"
          value={`${nanosToIota(gas.totalNanos)} IOTA`}
          hint={`${gas.txCount} tx${gas.txCount === 1 ? "" : "s"} tracked`}
          accent="amber"
          action={
            gas.txCount > 0 ? (
              <button
                onClick={handleResetGas}
                className={`text-[10px] uppercase tracking-wide inline-flex items-center gap-1 ${
                  confirming
                    ? "text-rose-600 hover:text-rose-700"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title={
                  confirming
                    ? "Click again to confirm reset"
                    : "Reset gas counter"
                }
              >
                <RotateCcw className="w-3 h-3" />
                {confirming ? "Confirm" : "Reset"}
              </button>
            ) : null
          }
        />
      </div>
    </section>
  );
}

const ACCENT_CLS: Record<string, { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  slate: { bg: "bg-slate-100", text: "text-slate-700" },
  rose: { bg: "bg-rose-100", text: "text-rose-700" },
  sky: { bg: "bg-sky-100", text: "text-sky-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
};

function Stat({
  icon,
  label,
  value,
  hint,
  accent,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: keyof typeof ACCENT_CLS;
  action?: React.ReactNode;
}) {
  const cls = ACCENT_CLS[accent];
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 ${cls.bg} ${cls.text} px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide`}
        >
          {icon}
          {label}
        </span>
        {action}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono leading-none">
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1.5">{hint}</div>
    </div>
  );
}

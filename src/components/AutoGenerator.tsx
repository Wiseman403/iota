import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Play,
  Square,
  Zap,
  Activity,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { loadKeypair } from "../iota/keypair";
import { buildBatchSendTx, signAndSend } from "../iota/transactions";
import { recordGasFromEffects } from "../lib/gasTracker";
import { generateBatch, type GeneratorConfig } from "../mock/generator";
import { explorerTxUrl } from "../config";
import { shortId } from "../lib/format";

interface Props {
  address: string | null;
}

interface Stats {
  batches: number;
  readings: number;
  lastBatchAt: string | null;
  lastDigest: string | null;
}

const DEFAULT_CONFIG: GeneratorConfig = {
  tempMean: 25,
  tempStd: 3,
  humidityMean: 60,
  humidityStd: 5,
  injectAnomalies: false,
};

export function AutoGenerator({ address }: Props) {
  const [config, setConfig] = useState<GeneratorConfig>(DEFAULT_CONFIG);
  const [batchSize, setBatchSize] = useState(5);
  const [intervalSec, setIntervalSec] = useState(15);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats>({
    batches: 0,
    readings: 0,
    lastBatchAt: null,
    lastDigest: null,
  });

  const queryClient = useQueryClient();
  const timerRef = useRef<number | null>(null);
  const sendingRef = useRef(false);

  // Stop the loop if the component unmounts.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  async function sendOneBatch() {
    if (!address || sendingRef.current) return;
    const keypair = loadKeypair();
    if (!keypair) {
      toast.error("No keypair loaded; stopping auto-mode.");
      stop();
      return;
    }

    sendingRef.current = true;
    try {
      const readings = generateBatch(config, batchSize);
      const tx = buildBatchSendTx(readings, address);
      const result = await signAndSend(tx, keypair);

      // Track the actual on-chain gas cost.
      recordGasFromEffects(result.effects);

      setStats((s) => ({
        batches: s.batches + 1,
        readings: s.readings + readings.length,
        lastBatchAt: new Date().toLocaleTimeString(),
        lastDigest: result.digest,
      }));

      // Refresh balance, hub counter, history table.
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["sensorHub"] });
      queryClient.invalidateQueries({ queryKey: ["ownedSensorData"] });
    } catch (err) {
      console.error("Auto-batch failed:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Auto-batch failed: ${message}. Stopping.`);
      stop();
    } finally {
      sendingRef.current = false;
    }
  }

  function start() {
    if (!address) {
      toast.error("Import a keypair first.");
      return;
    }
    setRunning(true);
    // Fire one immediately, then on the interval.
    void sendOneBatch();
    timerRef.current = window.setInterval(
      () => void sendOneBatch(),
      intervalSec * 1000,
    );
  }

  function stop() {
    setRunning(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function reset() {
    setStats({
      batches: 0,
      readings: 0,
      lastBatchAt: null,
      lastDigest: null,
    });
  }

  const disabled = !address;

  return (
    <section className="rounded-2xl bg-white shadow p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <Zap className="w-4 h-4" /> Auto-Generator
        </h2>
        {running ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Running
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            Idle
          </span>
        )}
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <NumField
            label="Temperature mean (°C)"
            value={config.tempMean}
            onChange={(v) => setConfig({ ...config, tempMean: v })}
            disabled={running}
          />
          <NumField
            label="Temperature std (°C)"
            value={config.tempStd}
            onChange={(v) => setConfig({ ...config, tempStd: v })}
            disabled={running}
          />
          <NumField
            label="Humidity mean (%)"
            value={config.humidityMean}
            onChange={(v) => setConfig({ ...config, humidityMean: v })}
            disabled={running}
          />
          <NumField
            label="Humidity std (%)"
            value={config.humidityStd}
            onChange={(v) => setConfig({ ...config, humidityStd: v })}
            disabled={running}
          />
        </div>

        <div className="space-y-3">
          <NumField
            label="Batch size (readings per PTB)"
            value={batchSize}
            min={1}
            max={20}
            onChange={(v) => setBatchSize(Math.max(1, Math.min(20, v)))}
            disabled={running}
          />
          <NumField
            label="Interval (seconds)"
            value={intervalSec}
            min={5}
            max={120}
            onChange={(v) => setIntervalSec(Math.max(5, v))}
            disabled={running}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.injectAnomalies}
              onChange={(e) =>
                setConfig({ ...config, injectAnomalies: e.target.checked })
              }
              disabled={running}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Inject anomalies (10% wider variance)
          </label>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {!running ? (
          <button
            onClick={start}
            disabled={disabled}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start auto-mode
          </button>
        ) : (
          <button
            onClick={stop}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 inline-flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        )}
        <button
          onClick={reset}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Reset stats
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Batches" value={stats.batches.toString()} />
        <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Readings" value={stats.readings.toString()} />
        <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Last batch" value={stats.lastBatchAt ?? "—"} />
      </div>

      {stats.lastDigest ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Last batch tx
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm text-slate-800">
              {shortId(stats.lastDigest)}
            </span>
            <a
              href={explorerTxUrl(stats.lastDigest)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 text-sm"
            >
              View on Explorer <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : null}

      {!address ? (
        <p className="mt-4 text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
          Import a keypair above to enable auto-mode.
        </p>
      ) : null}
    </section>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center justify-center gap-1 text-xs text-slate-500 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900 font-mono">
        {value}
      </div>
    </div>
  );
}

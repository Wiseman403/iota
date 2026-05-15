import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, ExternalLink, Thermometer, Droplets } from "lucide-react";
import { loadKeypair } from "../iota/keypair";
import { buildSendReadingTx, signAndSend } from "../iota/transactions";
import { recordGasFromEffects } from "../lib/gasTracker";
import { explorerTxUrl } from "../config";
import { shortId } from "../lib/format";

interface Props {
  address: string | null;
}

export function QuickSendCard({ address }: Props) {
  const [temperature, setTemperature] = useState(25);
  const [humidity, setHumidity] = useState(60);
  const [pending, setPending] = useState(false);
  const [lastDigest, setLastDigest] = useState<string | null>(null);

  const queryClient = useQueryClient();

  async function handleSend() {
    if (!address) return;
    const keypair = loadKeypair();
    if (!keypair) {
      toast.error("No keypair loaded.");
      return;
    }

    setPending(true);
    try {
      const tx = buildSendReadingTx(temperature, humidity, address);
      const result = await signAndSend(tx, keypair);
      setLastDigest(result.digest);

      // Track the actual on-chain gas cost.
      recordGasFromEffects(result.effects);

      toast.success(
        `Reading anchored: ${temperature}°C, ${humidity}% humidity`,
      );
      // Refresh balance, hub counter, history table.
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["sensorHub"] });
      queryClient.invalidateQueries({ queryKey: ["ownedSensorData"] });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Send failed: ${message}`);
    } finally {
      setPending(false);
    }
  }

  const disabled = !address || pending;

  return (
    <section className="rounded-2xl bg-white shadow p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
        <Send className="w-4 h-4" /> Quick Send
      </h2>

      <div className="mt-4 space-y-5">
        {/* Temperature slider */}
        <div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Thermometer className="w-4 h-4 text-rose-500" /> Temperature
            </label>
            <span className="font-mono text-sm text-slate-900">
              {temperature} °C
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full mt-1.5 accent-rose-500"
            disabled={pending}
          />
        </div>

        {/* Humidity slider */}
        <div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Droplets className="w-4 h-4 text-sky-500" /> Humidity
            </label>
            <span className="font-mono text-sm text-slate-900">
              {humidity} %
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={humidity}
            onChange={(e) => setHumidity(Number(e.target.value))}
            className="w-full mt-1.5 accent-sky-500"
            disabled={pending}
          />
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Will record: <span className="font-semibold">{temperature} °C</span>,{" "}
          <span className="font-semibold">{humidity} %</span> humidity
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Anchoring on testnet…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send to IOTA
            </>
          )}
        </button>

        {/* Last transaction */}
        {lastDigest ? (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Last transaction
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-sm text-slate-800">
                {shortId(lastDigest)}
              </span>
              <a
                href={explorerTxUrl(lastDigest)}
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
          <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
            Import a keypair above to enable Quick Send.
          </p>
        ) : null}
      </div>
    </section>
  );
}

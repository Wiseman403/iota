import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  History,
  RefreshCw,
  Thermometer,
  Droplets,
} from "lucide-react";
import { useOwnedSensorData } from "../hooks/useOwnedSensorData";
import { explorerObjectUrl } from "../config";
import { shortId } from "../lib/format";

interface Props {
  address: string | null;
  /** Optional threshold (°C) — readings at or above this are highlighted in red. */
  highTempThreshold?: number;
}

export function HistoryTable({ address, highTempThreshold = 30 }: Props) {
  const query = useOwnedSensorData(address);

  const readings = query.data ?? [];
  const hasData = readings.length > 0;

  function copy(text: string, label = "Copied") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  return (
    <section className="rounded-2xl bg-white shadow p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <History className="w-4 h-4" /> History
          {hasData ? (
            <span className="text-xs font-normal text-slate-400 normal-case">
              · {readings.length} on chain
            </span>
          ) : null}
        </h2>
        <button
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="text-slate-500 hover:text-slate-700 disabled:opacity-50 inline-flex items-center gap-1.5 text-sm"
          title="Refresh from chain"
        >
          <RefreshCw
            className={`w-4 h-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="mt-4">
        {!address ? (
          <EmptyState message="Import a keypair above to load your history." />
        ) : query.isLoading ? (
          <EmptyState message="Loading from testnet…" />
        ) : query.error ? (
          <EmptyState
            message={
              query.error instanceof Error
                ? `Error: ${query.error.message}`
                : "Error loading from testnet."
            }
            tone="error"
          />
        ) : !hasData ? (
          <EmptyState message="No readings yet. Use Quick Send above to record one." />
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Object ID</th>
                  <th className="px-2 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      Temp
                    </span>
                  </th>
                  <th className="px-2 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-500" />
                      Hum.
                    </span>
                  </th>
                  <th className="px-6 py-2 text-right">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readings.map((r, i) => {
                  const isHigh = r.temperature >= highTempThreshold;
                  return (
                    <tr
                      key={r.objectId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-2 text-slate-500 font-mono">
                        {readings.length - i}
                      </td>
                      <td className="px-2 py-2 font-mono text-slate-800">
                        {shortId(r.objectId)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-mono font-medium ${
                          isHigh ? "text-rose-600" : "text-slate-800"
                        }`}
                      >
                        {r.temperature} °C
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-800">
                        {r.humidity} %
                      </td>
                      <td className="px-6 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => copy(r.objectId, "Object ID copied")}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy object ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={explorerObjectUrl(r.objectId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-700"
                            title="View on Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasData && highTempThreshold ? (
        <p className="mt-3 text-xs text-slate-500">
          Readings ≥ {highTempThreshold} °C shown in red (UC2 visual highlight).
        </p>
      ) : null}
    </section>
  );
}

function EmptyState({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "error";
}) {
  const cls =
    tone === "error"
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-50 text-slate-600";
  return (
    <div className={`rounded-lg ${cls} px-4 py-6 text-sm text-center`}>
      {message}
    </div>
  );
}

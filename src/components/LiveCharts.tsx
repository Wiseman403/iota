import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { LineChart as ChartIcon, Thermometer, Droplets } from "lucide-react";
import { useOwnedSensorData } from "../hooks/useOwnedSensorData";

interface Props {
  address: string | null;
}

export function LiveCharts({ address }: Props) {
  const [threshold, setThreshold] = useState(30);
  const query = useOwnedSensorData(address);

  // Recharts wants oldest-first for a left-to-right time series.
  const data = useMemo(() => {
    const readings = query.data ?? [];
    return readings
      .slice()
      .reverse()
      .map((r, i) => ({
        i: i + 1,
        objectId: r.objectId,
        temperature: r.temperature,
        humidity: r.humidity,
      }));
  }, [query.data]);

  const hasData = data.length > 0;
  const maxIndex = data.length;

  return (
    <section className="rounded-2xl bg-white shadow p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <ChartIcon className="w-4 h-4" /> Live Charts
          {hasData ? (
            <span className="text-xs font-normal text-slate-400 normal-case">
              · {data.length} points
            </span>
          ) : null}
        </h2>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 uppercase tracking-wide">
            High-temp threshold
          </label>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-32 accent-rose-500"
          />
          <span className="font-mono text-sm text-slate-900 w-12 text-right">
            {threshold} °C
          </span>
        </div>
      </div>

      {!address ? (
        <Empty message="Import a keypair above to load charts." />
      ) : !hasData ? (
        <Empty message="No readings yet. Use Quick Send or Auto-Generator to record some." />
      ) : (
        <div className="mt-4 grid md:grid-cols-2 gap-6">
          {/* Temperature */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-2">
              <Thermometer className="w-4 h-4 text-rose-500" /> Temperature (°C)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="i"
                    type="number"
                    domain={[1, maxIndex]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    label={{ value: "reading #", position: "insideBottomRight", offset: -4, fill: "#94a3b8", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} domain={[0, 50]} />
                  <Tooltip content={<TempTooltip threshold={threshold} />} />
                  <ReferenceLine y={threshold} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `${threshold}°C`, fill: "#f43f5e", fontSize: 10, position: "right" }} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={(props) => <ColoredDot {...props} threshold={threshold} />}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-2">
              <Droplets className="w-4 h-4 text-sky-500" /> Humidity (%)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="i"
                    type="number"
                    domain={[1, maxIndex]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    label={{ value: "reading #", position: "insideBottomRight", offset: -4, fill: "#94a3b8", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0ea5e9" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {hasData ? (
        <p className="mt-3 text-xs text-slate-500">
          Temperature points ≥ {threshold} °C are shown in red — UC2 visual highlight.
          Charts auto-refresh as new readings arrive on chain (no page reload).
        </p>
      ) : null}
    </section>
  );
}

/** Custom dot that paints high-temp readings red, normal ones rose. */
function ColoredDot(props: {
  cx?: number;
  cy?: number;
  payload?: { temperature: number };
  threshold: number;
}) {
  const { cx, cy, payload, threshold } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const isHigh = payload.temperature >= threshold;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isHigh ? 4 : 3}
      fill={isHigh ? "#dc2626" : "#f43f5e"}
      stroke={isHigh ? "#7f1d1d" : "none"}
      strokeWidth={isHigh ? 1.5 : 0}
    />
  );
}

function TempTooltip({
  active,
  payload,
  threshold,
}: {
  active?: boolean;
  payload?: Array<{ payload: { i: number; temperature: number } }>;
  threshold: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  const isHigh = p.temperature >= threshold;
  return (
    <div className="rounded-md bg-white border border-slate-200 shadow-sm px-3 py-2 text-xs">
      <div className="text-slate-500">Reading #{p.i}</div>
      <div className={`font-mono mt-0.5 ${isHigh ? "text-rose-600 font-semibold" : "text-slate-800"}`}>
        {p.temperature} °C {isHigh ? "(above threshold)" : ""}
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg bg-slate-50 px-4 py-12 text-sm text-center text-slate-600">
      {message}
    </div>
  );
}

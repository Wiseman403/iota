import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  HelpCircle,
  Search,
  ExternalLink,
} from "lucide-react";
import { client } from "../iota/client";
import { PACKAGE_ID, explorerObjectUrl } from "../config";
import { shortId } from "../lib/format";

type Outcome =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "verified";
      objectId: string;
      version: string;
      owner: string;
      temperature: number;
      humidity: number;
    }
  | { kind: "tampered"; expected: { t: number; h: number }; actual: { t: number; h: number }; objectId: string }
  | { kind: "type_mismatch"; objectId: string; actualType: string }
  | { kind: "not_found"; queryId: string }
  | { kind: "error"; message: string };

interface MoveObjectFields {
  id: { id: string };
  temperature: string;
  humidity: string;
}

const EXPECTED_TYPE_SUFFIX = "::sensor::SensorData";

export function VerifierCard() {
  const [objectIdInput, setObjectIdInput] = useState("");
  const [expectedTemp, setExpectedTemp] = useState("");
  const [expectedHum, setExpectedHum] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function handleVerify() {
    const id = objectIdInput.trim();
    if (!id) {
      toast.error("Paste an object ID first.");
      return;
    }
    if (!id.startsWith("0x")) {
      toast.error("Object ID must start with 0x.");
      return;
    }

    setOutcome({ kind: "loading" });

    try {
      const result = await client.getObject({
        id,
        options: { showContent: true, showType: true, showOwner: true },
      });

      // Not found.
      if (!result.data) {
        setOutcome({ kind: "not_found", queryId: id });
        return;
      }

      const actualType = result.data.type ?? "";
      const expectedType = `${PACKAGE_ID}${EXPECTED_TYPE_SUFFIX}`;

      // Type mismatch — object exists but isn't a SensorData of our package.
      if (actualType !== expectedType) {
        setOutcome({
          kind: "type_mismatch",
          objectId: id,
          actualType: actualType || "unknown",
        });
        return;
      }

      const content = result.data.content;
      if (!content || content.dataType !== "moveObject") {
        setOutcome({
          kind: "error",
          message: "Object has no readable Move content.",
        });
        return;
      }

      const fields = content.fields as unknown as MoveObjectFields;
      const actualT = Number(fields.temperature);
      const actualH = Number(fields.humidity);

      // Owner — handle the union type from the SDK.
      const ownerField = result.data.owner;
      let ownerStr = "shared / immutable";
      if (ownerField && typeof ownerField === "object") {
        if ("AddressOwner" in ownerField)
          ownerStr = ownerField.AddressOwner as string;
        else if ("ObjectOwner" in ownerField)
          ownerStr = `object ${ownerField.ObjectOwner as string}`;
      }

      // Tampered check — only if user provided expected values.
      const expT = expectedTemp.trim();
      const expH = expectedHum.trim();
      if (expT !== "" || expH !== "") {
        const wantT = expT === "" ? actualT : Number(expT);
        const wantH = expH === "" ? actualH : Number(expH);
        if (wantT !== actualT || wantH !== actualH) {
          setOutcome({
            kind: "tampered",
            expected: { t: wantT, h: wantH },
            actual: { t: actualT, h: actualH },
            objectId: id,
          });
          return;
        }
      }

      setOutcome({
        kind: "verified",
        objectId: id,
        version: result.data.version,
        owner: ownerStr,
        temperature: actualT,
        humidity: actualH,
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setOutcome({ kind: "error", message });
    }
  }

  function clear() {
    setObjectIdInput("");
    setExpectedTemp("");
    setExpectedHum("");
    setOutcome({ kind: "idle" });
  }

  return (
    <section className="rounded-2xl bg-white shadow p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> Verifier
      </h2>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Object ID to verify
          </label>
          <input
            type="text"
            value={objectIdInput}
            onChange={(e) => setObjectIdInput(e.target.value)}
            placeholder="0xfca16d09... (paste a SensorData object ID)"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Expected values (optional) */}
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900 select-none">
            Optional: provide expected values (TAMPERED check)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Expected temperature (°C)
              </label>
              <input
                type="number"
                value={expectedTemp}
                onChange={(e) => setExpectedTemp(e.target.value)}
                placeholder="leave blank to skip"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Expected humidity (%)
              </label>
              <input
                type="number"
                value={expectedHum}
                onChange={(e) => setExpectedHum(e.target.value)}
                placeholder="leave blank to skip"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </details>

        <div className="flex gap-2">
          <button
            onClick={handleVerify}
            disabled={outcome.kind === "loading"}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {outcome.kind === "loading" ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Verify
              </>
            )}
          </button>
          <button
            onClick={clear}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        {/* Outcome panels */}
        {outcome.kind === "verified" && (
          <OutcomePanel
            tone="verified"
            icon={<ShieldCheck className="w-5 h-5" />}
            title="VERIFIED"
            subtitle="Object exists on chain and matches the SensorData type."
          >
            <KeyVal label="Object" value={shortId(outcome.objectId)} link={explorerObjectUrl(outcome.objectId)} />
            <KeyVal label="Version" value={outcome.version} />
            <KeyVal label="Owner" value={shortId(outcome.owner)} />
            <KeyVal label="Temperature" value={`${outcome.temperature} °C`} />
            <KeyVal label="Humidity" value={`${outcome.humidity} %`} />
          </OutcomePanel>
        )}

        {outcome.kind === "tampered" && (
          <OutcomePanel
            tone="tampered"
            icon={<ShieldX className="w-5 h-5" />}
            title="TAMPERED"
            subtitle="Object exists but on-chain values differ from the expected ones."
          >
            <KeyVal label="Object" value={shortId(outcome.objectId)} link={explorerObjectUrl(outcome.objectId)} />
            <KeyVal
              label="Expected"
              value={`${outcome.expected.t} °C, ${outcome.expected.h} %`}
            />
            <KeyVal
              label="Actual on chain"
              value={`${outcome.actual.t} °C, ${outcome.actual.h} %`}
            />
          </OutcomePanel>
        )}

        {outcome.kind === "type_mismatch" && (
          <OutcomePanel
            tone="mismatch"
            icon={<ShieldAlert className="w-5 h-5" />}
            title="TYPE MISMATCH"
            subtitle="Object exists but isn't a SensorData of this package."
          >
            <KeyVal label="Object" value={shortId(outcome.objectId)} link={explorerObjectUrl(outcome.objectId)} />
            <KeyVal label="Actual type" value={outcome.actualType} />
            <KeyVal
              label="Expected type"
              value={`${shortId(PACKAGE_ID)}${EXPECTED_TYPE_SUFFIX}`}
            />
          </OutcomePanel>
        )}

        {outcome.kind === "not_found" && (
          <OutcomePanel
            tone="missing"
            icon={<HelpCircle className="w-5 h-5" />}
            title="NOT FOUND"
            subtitle="No object with that ID exists on the testnet."
          >
            <KeyVal label="Queried" value={shortId(outcome.queryId)} />
          </OutcomePanel>
        )}

        {outcome.kind === "error" && (
          <OutcomePanel
            tone="error"
            icon={<ShieldAlert className="w-5 h-5" />}
            title="ERROR"
            subtitle="The query failed. Check the console for details."
          >
            <KeyVal label="Message" value={outcome.message} />
          </OutcomePanel>
        )}
      </div>
    </section>
  );
}

function OutcomePanel({
  tone,
  icon,
  title,
  subtitle,
  children,
}: {
  tone: "verified" | "tampered" | "mismatch" | "missing" | "error";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    verified: "bg-emerald-50 border-emerald-200 text-emerald-900",
    tampered: "bg-rose-50 border-rose-200 text-rose-900",
    mismatch: "bg-orange-50 border-orange-200 text-orange-900",
    missing: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-rose-50 border-rose-200 text-rose-900",
  };
  const iconCls: Record<string, string> = {
    verified: "text-emerald-600",
    tampered: "text-rose-600",
    mismatch: "text-orange-600",
    missing: "text-amber-600",
    error: "text-rose-600",
  };
  return (
    <div className={`rounded-lg border ${styles[tone]} p-4`}>
      <div className="flex items-start gap-3">
        <div className={iconCls[tone]}>{icon}</div>
        <div className="flex-1">
          <p className="font-semibold tracking-wide">{title}</p>
          <p className="text-xs opacity-80">{subtitle}</p>
          <dl className="mt-3 space-y-1 text-sm">{children}</dl>
        </div>
      </div>
    </div>
  );
}

function KeyVal({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs uppercase tracking-wide opacity-70 w-32 shrink-0">
        {label}
      </dt>
      <dd className="font-mono text-sm break-all flex-1">{value}</dd>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100"
          title="View on Explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : null}
    </div>
  );
}

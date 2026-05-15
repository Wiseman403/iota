
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  Trash2,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { client } from "./iota/client";
import {
  fromMnemonic,
  generateKeypair,
  loadKeypair,
  saveKeypair,
  clearKeypair,
  addressOf,
} from "./iota/keypair";
import { fund } from "./iota/faucet";
import { shortId, nanosToIota } from "./lib/format";
import {
  PACKAGE_ID,
  SENSOR_HUB_ID,
  DEPLOYER_ADDRESS,
  explorerObjectUrl,
} from "./config";
import { StatsCard } from "./components/StatsCard";
import { QuickSendCard } from "./components/QuickSendCard";
import { AutoGenerator } from "./components/AutoGenerator";
import { LiveCharts } from "./components/LiveCharts";
import { VerifierCard } from "./components/VerifierCard";
import { HistoryTable } from "./components/HistoryTable";

const HIGH_TEMP_THRESHOLD = 30;

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState("");
  const [funding, setFunding] = useState(false);

  // On mount, see if we already have a keypair in storage.
  useEffect(() => {
    const kp = loadKeypair();
    if (kp) setAddress(addressOf(kp));
  }, []);

  const balanceQuery = useQuery({
    queryKey: ["balance", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const result = await client.getBalance({
        owner: address!,
        coinType: "0x2::iota::IOTA",
      });
      return result.totalBalance;
    },
    refetchInterval: 10_000,
  });

  function importMnemonic() {
    const trimmed = mnemonic.trim();
    if (trimmed.split(/\s+/).length < 12) {
      toast.error("Recovery phrase must be at least 12 words.");
      return;
    }
    try {
      const kp = fromMnemonic(trimmed);
      saveKeypair(kp);
      setAddress(addressOf(kp));
      setMnemonic("");
      toast.success("Keypair imported from recovery phrase.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to derive keypair from that phrase.");
    }
  }

  function generateFresh() {
    const kp = generateKeypair();
    saveKeypair(kp);
    setAddress(addressOf(kp));
    toast.success("Generated a fresh keypair.");
  }

  function reset() {
    clearKeypair();
    setAddress(null);
    toast.info("Cleared local keypair.");
  }

  async function handleFund() {
    if (!address) return;
    setFunding(true);
    try {
      await fund(address);
      toast.success("Faucet request sent. Tokens land within ~60 seconds.");
      setTimeout(() => balanceQuery.refetch(), 30_000);
    } catch (err) {
      console.error(err);
      toast.error("Faucet request failed. Check the console.");
    } finally {
      setFunding(false);
    }
  }

  function copy(text: string, label = "Copied") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  const isDeployer = address === DEPLOYER_ADDRESS;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              IOTA Rebased Sensor dApp
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Mock agricultural sensor readings · anchored on IOTA Rebased L1 testnet
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Testnet · Move L1
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Hero stats */}
        <StatsCard address={address} highTempThreshold={HIGH_TEMP_THRESHOLD} />

        {/* Deployment IDs */}
        <section className="rounded-2xl bg-white shadow p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Deployment
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row
              label="PACKAGE_ID"
              value={PACKAGE_ID}
              onCopy={() => copy(PACKAGE_ID)}
              link={explorerObjectUrl(PACKAGE_ID)}
            />
            <Row
              label="SENSOR_HUB_ID"
              value={SENSOR_HUB_ID}
              onCopy={() => copy(SENSOR_HUB_ID)}
              link={explorerObjectUrl(SENSOR_HUB_ID)}
            />
            <Row
              label="DEPLOYER"
              value={DEPLOYER_ADDRESS}
              onCopy={() => copy(DEPLOYER_ADDRESS)}
            />
          </dl>
        </section>

        {/* SETUP */}
        <SectionLabel>Setup</SectionLabel>
        <section className="rounded-2xl bg-white shadow p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Wallet
          </h2>

          {!address && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Import from 12-word recovery phrase (D0a — required to mutate this SensorHub):
                </label>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="word1 word2 word3 ..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={importMnemonic}
                  disabled={!mnemonic.trim()}
                  className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  Import keypair
                </button>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Or generate a fresh keypair (won't own the deployed SensorHub, useful only as a smoke test):
                </p>
                <button
                  onClick={generateFresh}
                  className="mt-2 px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-300"
                >
                  Generate new keypair
                </button>
              </div>
            </div>
          )}

          {address && (
            <div className="mt-4 space-y-4">
              <Row label="ADDRESS" value={address} onCopy={() => copy(address)} />
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Status:</span>
                {isDeployer ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                    ✓ Matches deployer — owns SensorHub
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                    Not the deployer — cannot mutate SensorHub
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-sm text-slate-500">Balance</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {balanceQuery.isLoading
                      ? "…"
                      : balanceQuery.error
                      ? "error"
                      : `${nanosToIota(balanceQuery.data ?? "0")} IOTA`}
                  </p>
                </div>
                <button
                  onClick={() => balanceQuery.refetch()}
                  className="text-slate-500 hover:text-slate-700"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleFund}
                  disabled={funding}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {funding ? "Requesting…" : "Fund from faucet"}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Clear key
                </button>
              </div>
            </div>
          )}
        </section>

        {/* WRITE */}
        <SectionLabel>Write</SectionLabel>
        <QuickSendCard address={address} />
        <AutoGenerator address={address} />

        {/* ANALYTICS */}
        <SectionLabel>Analytics</SectionLabel>
        <LiveCharts address={address} />

        {/* AUDIT */}
        <SectionLabel>Audit</SectionLabel>
        <VerifierCard />
        <HistoryTable address={address} highTempThreshold={HIGH_TEMP_THRESHOLD} />

        <footer className="text-xs text-slate-500 text-center pt-4 pb-2 border-t border-slate-200 mt-8">
          <p>
            Graduation prototype · Mock sensor data only · Anchored on IOTA Rebased testnet
          </p>
          <p className="mt-1 text-slate-400">
            See <code className="font-mono">LIMITATIONS.md</code> for known limitations and future work.
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-3">
      <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em]">
        {children}
      </h2>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  link,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <dt className="text-xs font-medium text-slate-500 w-32 shrink-0 pt-1">
        {label}
      </dt>
      <dd className="flex-1 font-mono text-sm text-slate-800 break-all">
        {shortId(value)}
      </dd>
      <button
        onClick={onCopy}
        className="text-slate-400 hover:text-slate-700"
        title="Copy"
      >
        <Copy className="w-4 h-4" />
      </button>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-slate-700"
          title="View on Explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      ) : null}
    </div>
  );
}

export default App;

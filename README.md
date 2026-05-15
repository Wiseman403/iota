# IOTA Rebased Sensor dApp

A decentralized application for anchoring agricultural sensor readings on the IOTA Rebased L1 testnet. Each reading (temperature, humidity) is recorded on-chain through a Move smart contract, with batched writes that turn N anchors into a single wallet signature.

**Live demo:** [jedidi.me/iota](https://jedidi.me/iota/)

![hero](src/assets/hero.png)

---

## What it does

The app is a web client for a Move package deployed on IOTA Rebased testnet. It lets a user:

- Generate a fresh keypair or import one from a 12-word recovery phrase
- Request testnet tokens from the IOTA faucet directly in the browser
- Submit sensor readings to a shared `SensorHub` object, either one at a time or as a batched Programmable Transaction Block
- Auto-generate mock readings on a timer for demo and stress-test scenarios
- Visualize live temperature and humidity history with Recharts
- Verify any past `SensorData` object against the on-chain record
- Browse the full history of readings owned by the connected address

The package and hub are pre-deployed; the frontend talks to them through `@iota/iota-sdk` and TanStack Query.

## Why batched writes matter

A naive implementation submits one transaction per reading, which means one wallet signature per reading. For a sensor pinging every few seconds this is unworkable.

The dApp builds a Programmable Transaction Block (PTB) that invokes `sensor::new_sensor_reading` N times in one transaction, increments the hub counter atomically, and transfers all N resulting `SensorData` objects to the owner. **One signature, N anchors.** That single PTB is what makes batch mode practical.

## Tech stack

| Layer | Tooling |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| State/data | TanStack Query, React hooks |
| UI | lucide-react icons, sonner toasts, recharts |
| Chain | IOTA Rebased testnet, Move smart contract |
| SDK | `@iota/iota-sdk` |
| Deploy | GitHub Pages |

## Project structure

```
src/
├── App.tsx                  # Top-level layout, wallet panel, section grid
├── config.ts                # Loads VITE_* env vars, exposes explorer helpers
├── main.tsx                 # React + Query provider bootstrap
├── components/
│   ├── StatsCard.tsx        # Aggregate stats over recent readings
│   ├── QuickSendCard.tsx    # Manual single-reading submit
│   ├── AutoGenerator.tsx    # Timer-driven batch submission
│   ├── LiveCharts.tsx       # Recharts temp + humidity time series
│   ├── VerifierCard.tsx     # On-chain verification of a SensorData id
│   └── HistoryTable.tsx     # Owned readings, with high-temp flagging
├── hooks/
│   ├── useSensorHub.ts      # Reads the shared SensorHub object
│   ├── useOwnedSensorData.ts# Lists SensorData objects owned by an address
│   ├── useReadingStats.ts   # Aggregates min/max/avg over a time window
│   └── useGasTracker.ts     # Tracks gas spent per session
├── iota/
│   ├── client.ts            # IOTA SDK client wired to testnet RPC
│   ├── keypair.ts           # Ed25519 keypair gen / import / persistence
│   ├── faucet.ts            # Calls the testnet faucet
│   └── transactions.ts      # buildSendReadingTx, buildBatchSendTx
├── lib/
│   ├── format.ts            # nanos↔IOTA, short-id helpers
│   └── gasTracker.ts        # Gas accounting logic
└── mock/
    └── generator.ts         # Realistic temp/humidity sample stream
```

## Getting started locally

**Prerequisites:** Node 20+, npm.

```bash
git clone https://github.com/Wiseman403/iota.git
cd iota
npm install
```

Create a `.env.local` at the project root:

```env
VITE_PACKAGE_ID=0x...
VITE_SENSOR_HUB_ID=0x...
VITE_TESTNET_RPC=https://api.testnet.iota.cafe
VITE_FAUCET_URL=https://faucet.testnet.iota.cafe/gas
VITE_DEPLOYER_ADDRESS=0x...
```

Then run the dev server:

```bash
npm run dev
```

Open [localhost:5173](http://localhost:5173) and you should see the dApp. To talk to the deployed `SensorHub` (i.e. actually mutate it), import the deployer's recovery phrase via the wallet panel. Any other keypair can still read history and run smoke tests.

### Testing wallet (deployer key)

For convenience, here is the testnet recovery phrase that owns the deployed `SensorHub`. Paste it into the wallet panel's import field to be able to submit readings:

```
cup business save angle able rookie goddess surround rabbit powder eternal upgrade
```

> ⚠️ **Testnet only.** This mnemonic controls testnet objects with no real-world value. It must never be reused on mainnet or any other network, and no real funds should ever be sent to its addresses. Anyone reading this README can sign transactions with it.

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_PACKAGE_ID` | Move package address containing the `sensor` module |
| `VITE_SENSOR_HUB_ID` | Object ID of the shared `SensorHub` |
| `VITE_TESTNET_RPC` | JSON-RPC endpoint for IOTA Rebased testnet |
| `VITE_FAUCET_URL` | Faucet endpoint for funding new addresses |
| `VITE_DEPLOYER_ADDRESS` | Address that deployed the package; used to gate mutation UI |

All `VITE_*` vars are embedded in the client bundle at build time. Treat them as public. Do not commit private keys or recovery phrases.

## Build & deploy

Production build:

```bash
npm run build
```

The repo is set up to deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`. Pushes to `main` trigger a fresh build and publish the resulting `dist/` to Pages. The Vite `base` is set to `/iota/`, matching the deployed path under the custom domain.

To deploy manually (e.g. when Actions is unavailable):

```bash
npm run build
npx gh-pages -d dist -b gh-pages
```

Then point Pages at the `gh-pages` branch in repo settings.

## On-chain contract

The Move package exposes a single module, `sensor`, with these key items:

- `SensorHub` — a shared object holding a `total_readings` counter
- `SensorData` — an owned object representing a single reading (`temperature`, `humidity`, `timestamp_ms`, `sequence_no`)
- `new_sensor_reading(hub: &mut SensorHub, temp: u64, humidity: u64): SensorData` — entry function that increments the hub counter and emits a fresh `SensorData`

Frontend transactions wrap calls to `new_sensor_reading` inside a Programmable Transaction Block, optionally invoking it many times in one block (batch mode) before `transferObjects(...)` hands the readings to the caller's address.

## Scope and limitations

This is a graduation prototype. A few honest notes:

- **Mock data only.** Readings come from `src/mock/generator.ts`, not real hardware. The point of the project is the on-chain anchoring path, not the sensor itself.
- **Testnet only.** Tokens have no value, the network can be reset, and the faucet may be rate-limited.
- **Single-deployer mutation.** Only the address that deployed the package can submit readings, since the package wasn't built with multi-tenant access control. Anyone else gets a read-only view.
- **Browser-local keys.** The keypair lives in `localStorage`. Convenient for a prototype, never use this pattern with real funds.

See `LIMITATIONS.md` for the full list and future work.

## License

ISC. See `package.json`.

## Acknowledgements

Built on [@iota/iota-sdk](https://www.npmjs.com/package/@iota/iota-sdk), the IOTA Rebased testnet, and the Vite + React ecosystem.

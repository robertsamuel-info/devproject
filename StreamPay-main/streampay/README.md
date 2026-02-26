# Nexora AI Treasury

### Autonomous Payroll & Cashflow Agent for Web3

> **DevDash 2026** · Built on Somnia Testnet

---

## The Problem

Web3 startups pay their teams badly.

- Payroll is **manual** (send transaction → wait → repeat)
- Treasury management is **reactive** (you discover you're out of money when you're out of money)
- There is **no fraud protection** on outgoing streams
- **No cashflow forecasting** — founders fly blind
- No automation — every operation requires human attention

Traditional solutions (Gnosis Safe, Superfluid) solve the *mechanics* of streaming but leave the **intelligence layer completely empty**.

---

## Our Solution

**Nexora AI Treasury** is the world's first autonomous AI-powered treasury dashboard for Web3 payroll.

It combines real on-chain streaming with four AI agents that work continuously in the background:

| Agent | What It Does |
|---|---|
| Cashflow Predictor | Linear regression on stream history → 90-day balance forecast with confidence bands |
| Fraud Detector | Local heuristic pre-filter + Gemini AI risk scoring (0–100) on every stream |
| Treasury Agent | Rule engine generates gas-saving, pausing, and rebalancing recommendations |
| NLP Stream Parser | Natural language → structured stream parameters via Gemini structured JSON output |

---

## Key Features

### For Founders
- **90-Day Runway Chart** — AI-predicted treasury balance with burn rate and risk level
- **Role-Based Dashboard** — toggle between Founder mode and Employee mode
- **Autonomous Recommendations** — AI agent suggests batching, pausing risky streams, and when to top up
- **Treasury Health Score** — single 0–100 score summarising your financial health

### For Employees
- **Incoming Stream Status** — see your stream progress and ETA
- **Real-Time Balance** — balance updates every 2 seconds
- **Withdrawal** — one-click withdraw from the UI

### Platform
- **Visual Stream Animation** — canvas-based particle animation showing real payment flows
- **Fraud Risk Dashboard** — full `/analytics/risk` page with per-stream AI explanation
- **Keeper Automation** — off-chain bot batches stream updates every 30 seconds for gas efficiency
- **NLP Creation** — create streams by typing plain English

---

## Comparison

| Feature | Original StreamPay | Nexora AI Treasury |
|---|---|---|
| Cashflow Prediction | No | Yes — 90-day AI forecast |
| Risk Scoring | Basic | Local heuristics + Gemini 0–100 |
| Treasury Agent | No | Autonomous rule engine + AI summary |
| Role-Based UX | No | Founder / Employee modes |
| Stream Animation | No | Canvas particle flow |
| Risk Dashboard | No | Dedicated `/analytics/risk` route |
| Architecture | Flat | Clean: types/, lib/ai/, components/dashboard/ |
| AI Agents | 2 | 5 (NLP, Fraud, Cashflow, Treasury, Keeper) |

---

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3, Framer Motion |
| Charts | Recharts |
| Web3 | wagmi v2, viem v2, RainbowKit v2 |
| Blockchain | Somnia Testnet (Chain ID 50312) |
| AI | Google Gemini 2.5 Flash |
| Data Cache | TanStack React Query v5 |
| Keeper Bot | Node.js + ts-node |

---

## Getting Started

### 1. Clone & Install

```bash
cd streampay
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Somnia Testnet contract addresses
NEXT_PUBLIC_STREAM_PAY_ADDRESS=0xeff8b331a37cb2c03c04a087c53695a2b6dc0d45
NEXT_PUBLIC_STREAM_FACTORY_ADDRESS=0xd91324c4c700bea8748ec11d8c510d8b32d2ca00
NEXT_PUBLIC_STREAM_KEEPER_ADDRESS=0x251c6cff222eed46017731b4c87afd7af08f0c60

# WalletConnect (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Google Gemini AI (get from ai.google.dev)
GOOGLE_API_KEY=your_gemini_api_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 4. Run Keeper Bot (optional)

```bash
# Create contracts/.env
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
STREAM_PAY_ADDRESS=0xeff8b331a37cb2c03c04a087c53695a2b6dc0d45
KEEPER_PRIVATE_KEY=your_private_key
GOOGLE_API_KEY=your_gemini_api_key

npm run keeper
```

### 5. Connect Wallet

- Install MetaMask or any WalletConnect wallet
- Add Somnia Testnet: RPC `https://dream-rpc.somnia.network`, Chain ID `50312`
- Get test STT from the Somnia faucet
- Connect and explore

---

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full 3-layer system diagram, data flow charts, and AI agent table.

---

## Demo Script

See [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) for the 3-minute hackathon demo script.

---

## Roadmap

### Phase 1 — Current (MVP)
- [x] Per-second payment streaming on Somnia
- [x] NLP stream creation
- [x] Fraud detection (heuristics + AI)
- [x] AI cashflow prediction (90-day runway)
- [x] Autonomous treasury agent
- [x] Role-based dashboard
- [x] Live stream animation
- [x] Risk dashboard

### Phase 2 — Next (3 months)
- [ ] On-chain event indexing (replace synthetic history with real event logs)
- [ ] Persistent fraud history (Vercel Postgres / Supabase)
- [ ] Push notifications for risk alerts (email/Telegram)
- [ ] Multi-chain support (Ethereum, Arbitrum, Base)

### Phase 3 — Scale (6 months)
- [ ] SaaS dashboard (multi-org, team management)
- [ ] Payroll templates marketplace
- [ ] Custom keeper strategies
- [ ] DAO treasury integration

---

## Business Model

| Tier | Features | Price |
|---|---|---|
| Free | Up to 5 active streams, basic dashboard | $0 |
| Startup | Unlimited streams, AI features, risk alerts | $49/month |
| Enterprise | Multi-sig, custom AI rules, priority keeper slots | $299/month |
| Protocol | Keeper automation fee per batch execute | 0.1% of batch value |

---

## License

MIT

---

*Built for DevDash 2026 · Powered by Somnia Testnet + Gemini AI*

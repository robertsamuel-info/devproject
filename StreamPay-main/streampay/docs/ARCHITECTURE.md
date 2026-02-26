# Nexora AI Treasury — System Architecture

## Overview

Nexora AI Treasury is a three-layer system:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  Next.js 14 App Router · Tailwind CSS · Framer Motion           │
│                                                                  │
│  Dashboard  ·  Create Stream  ·  Analytics  ·  Risk Dashboard   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                         AI ENGINE LAYER                          │
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────┐                    │
│  │ Cashflow          │   │ Treasury Agent    │                   │
│  │ Predictor         │   │ (rule engine +    │                   │
│  │ (linear regression│   │  Gemini summary)  │                   │
│  │  + Gemini insight)│   │                  │                    │
│  └──────────────────┘   └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────┐                    │
│  │ NLP Stream Parser │   │ Fraud Detector    │                   │
│  │ (Gemini structured│   │ (local heuristics │                   │
│  │  JSON output)     │   │  + Gemini scoring)│                   │
│  └──────────────────┘   └──────────────────┘                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      SMART CONTRACT LAYER                         │
│  Somnia Testnet (Chain ID: 50312)                                │
│                                                                  │
│  StreamPay.sol      ·  StreamFactory.sol  ·  StreamKeeper.sol   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Stream Creation

```
User Input (natural language)
    │
    ▼
NLP Parser (/api/parse-stream)
    │  Gemini 2.5 Flash structured JSON output
    ▼
Fraud Pre-Check (/api/check-fraud)
    │  Local heuristics → Gemini AI scoring
    ▼
Risk Modal (warn/block/proceed)
    │
    ▼
StreamPay.createStream() on-chain
    │
    ▼
StreamCreated event → Dashboard update
```

### Cashflow Prediction

```
wagmi useBalance()  +  useUserStreams()
    │
    ▼
/api/cashflow  →  lib/ai/cashflow-predictor.ts
    │
    │  1. Group events into daily flows
    │  2. Linear regression on last 30 days
    │  3. Project 7/30/90-day balance series
    │  4. Risk score + risk level
    │  5. Gemini 2.5 Flash: 1-sentence narrative
    ▼
RunwayChart + TreasuryOverview components
```

### Treasury Agent

```
useProtocolStats()  +  useUserStreams()  +  useCashflow()
    │
    ▼
/api/treasury  →  lib/ai/treasury-agent.ts
    │
    │  Rule engine:
    │   · Batch check (≥3 streams → gas savings)
    │   · Pause alerts (riskScore > 70)
    │   · Runway alert (< 30 days)
    │   · Rebalance suggestion (30–90 days)
    │   · Health score (100 → deductions)
    │  Gemini 2.5 Flash: 2-sentence summary
    ▼
AIRecommendationsPanel  (dismissable cards)
```

### Keeper Automation

```
intelligent-keeper.ts  (Node.js process)
    │  setInterval: every 30 seconds
    ▼
getActiveStreamIds()  →  viem publicClient
    │
    ▼
batch-optimizer.ts  →  Gemini 2.5 Flash
    │  Prompt: market conditions, stream priorities, profitability
    ▼
batchUpdateStreams()  if profitable
```

---

## AI Agent Table

| Agent | Trigger | Model | Output |
|---|---|---|---|
| NLP Parser | User types natural language | Gemini 2.5 Flash | Structured stream params JSON |
| Fraud Detector | Pre-stream creation | Local heuristics + Gemini 2.5 Flash | Risk score 0–100, recommendation |
| Cashflow Predictor | Dashboard load / 60s refresh | Linear regression + Gemini 2.5 Flash | 90-day balance projection, runway days |
| Treasury Agent | Dashboard load / 120s refresh | Rule engine + Gemini 2.5 Flash | Recommendations list, health score |
| Batch Optimizer | Keeper loop (every 30s) | Gemini 2.5 Flash | Batch decision, stream groupings |

---

## Deployed Contract Addresses (Somnia Testnet)

| Contract | Address |
|---|---|
| StreamPay | `0xeff8b331a37cb2c03c04a087c53695a2b6dc0d45` |
| StreamKeeper | `0x251c6cff222eed46017731b4c87afd7af08f0c60` |
| StreamFactory | `0xd91324c4c700bea8748ec11d8c510d8b32d2ca00` |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS v3, Framer Motion, Recharts |
| Web3 | wagmi v2, viem v2, RainbowKit v2 |
| Chain | Somnia Testnet (Chain ID 50312) |
| AI | Google Gemini 2.5 Flash |
| Data Caching | TanStack React Query v5 |
| Wallet | RainbowKit (multi-wallet) |
| Keeper | Node.js + viem (standalone process) |

---

## Directory Structure

```
streampay/
├── app/
│   ├── page.tsx                  # Main dashboard (Nexora AI Treasury)
│   ├── create/page.tsx           # NLP + form stream creation
│   ├── templates/page.tsx        # Stream templates
│   ├── analytics/
│   │   ├── page.tsx              # Protocol analytics + AI cashflow chart
│   │   └── risk/page.tsx         # Fraud risk dashboard (NEW)
│   └── api/
│       ├── parse-stream/route.ts # NLP parser
│       ├── check-fraud/route.ts  # Fraud scorer
│       ├── cashflow/route.ts     # Cashflow predictor (NEW)
│       └── treasury/route.ts     # Treasury agent (NEW)
├── components/
│   ├── dashboard/                # NEW: AI dashboard components
│   │   ├── AIRecommendationsPanel.tsx
│   │   ├── RiskMeter.tsx
│   │   ├── RoleSwitcher.tsx
│   │   ├── RunwayChart.tsx
│   │   ├── StreamTable.tsx
│   │   └── TreasuryOverview.tsx
│   ├── layout/
│   │   ├── Header.tsx            # Rebranded: Nexora + Risk nav item
│   │   └── StreamCard.tsx
│   └── ui/
│       ├── LiveStreamFlow.tsx    # NEW: Canvas particle animation
│       └── (shadcn components)
├── hooks/
│   ├── useCashflow.ts            # NEW: cashflow prediction hook
│   ├── useTreasuryAgent.ts       # NEW: treasury agent hook
│   ├── useStreamContract.ts
│   ├── useTemplates.ts
│   └── useTheme.ts
├── keeper/
│   ├── intelligent-keeper.ts     # Keeper bot (30s loop)
│   └── batch-optimizer.ts        # Gemini batch decision
├── lib/
│   ├── ai/                       # NEW: AI engine
│   │   ├── cashflow-predictor.ts
│   │   └── treasury-agent.ts
│   ├── stream-fraud-detector.ts  # Enhanced: local heuristics + Gemini
│   ├── contracts.ts
│   ├── utils.ts
│   └── abis/
└── types/
    └── index.ts                  # NEW: shared TypeScript interfaces
```

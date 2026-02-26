# Nexora AI Treasury — 3-Minute Hackathon Demo Script

> **Format**: Live browser walkthrough · DevDash 2026

---

## ⏱ 0:00 – 0:30 | Problem Statement (30 sec)

**Say:**
> "Web3 startups pay their teams badly. Payroll is manual, delayed, and opaque.
> Traditional crypto payroll has no intelligence — no fraud detection, no cashflow forecasting,
> no automation. One bad actor can drain your treasury overnight.
>
> Meet **Nexora AI Treasury** — the world's first autonomous AI-powered payroll agent on blockchain."

*[Pause — let the dashboard load on screen]*

---

## ⏱ 0:30 – 1:00 | Dashboard Overview (30 sec)

**Show**: Main dashboard at `/`

**Do:**
1. Point to the **5 Treasury Overview stat cards** — Treasury Balance, Monthly Burn, Active Streams, Runway, Health Score
2. Say: "This is real on-chain data from Somnia Testnet powering everything you see."

**Do:**
3. Click the **Employee** toggle on `RoleSwitcher`
4. Say: "A founder and employee see completely different views — founders see burn rate and risk, employees see their ETA and incoming balance."
5. Toggle back to **Founder**

---

## ⏱ 1:00 – 1:30 | AI Features (30 sec)

**Show**: RunwayChart + AIRecommendationsPanel

**Say:**
> "Our AI cashflow predictor runs a linear regression on your stream history,
> projects your treasury balance 90 days forward, and calculates your exact runway.
> That dashed line? That's the AI forecast with confidence bands."

**Point to AIRecommendationsPanel:**
> "The treasury agent is constantly running in the background.
> Right now it's suggesting we batch 3 keeper calls to save 18% on gas.
> Watch — I can dismiss this and it generates the next priority."

*[Dismiss a recommendation — new one appears]*

**Show**: LiveStreamFlow animation

> "And here you can actually *see* your money flowing — token particles moving in real-time, speed proportional to the actual stream rate."

---

## ⏱ 1:30 – 2:00 | Create Stream with NLP (30 sec)

**Navigate to**: `/create`

**Type in NLP box:**
> `pay $500 per month to 0x1234...abcd for engineering work starting now`

**Click "Parse with AI"**

> "Gemini parses the natural language intent and pre-fills the form. No manual entry."

**Click Submit** — fraud modal appears

> "Before any stream goes on-chain, our fraud engine runs. Local heuristics check wallet age and patterns, then Gemini provides a risk score. Low risk — we proceed."

---

## ⏱ 2:00 – 2:30 | Risk Dashboard (30 sec)

**Navigate to**: `/analytics/risk`

**Show**: RiskMeter gauge + StreamRiskRow table

> "Every active stream in the protocol is scored 0 to 100 for fraud risk.
> The SVG arc gauge shows the aggregate risk right now."

**Click a high-risk row to expand it:**

> "When a stream scores high, you get the AI explanation, the specific risk factors,
> and one-click actions — block it, mark it safe, or view it on-chain."

---

## ⏱ 2:30 – 3:00 | Impact & Close (30 sec)

**Navigate back to**: `/analytics`

**Show**: AI Cashflow Forecast chart with prediction banner

**Say:**
> "Nexora replaces a full-time CFO, a payroll manager, and a risk analyst.
>
> It runs 24/7, costs nothing to operate beyond gas, and it gets smarter with every stream.
>
> We're not building another crypto payment tool — we're building the **autonomous financial
> operating system for Web3 companies**.
>
> This is Nexora AI Treasury — and it's live on Somnia Testnet right now."

*[End on dashboard with Live indicator pulsing green]*

---

## 🎯 Key Talking Points for Q&A

- **Real AI, not fake**: cashflow predictor uses actual linear regression; treasury agent uses a real rule engine; Gemini only adds narrative
- **Real on-chain data**: every stat connects to deployed contracts on Somnia
- **Gas optimization**: keeper bot saves ~15–20% through intelligent batching
- **Role-based UX**: same data, completely different UX for founder vs employee
- **Architecture**: clean separation — `types/`, `lib/ai/`, `components/dashboard/`, `hooks/` — judges can inspect and understand it in minutes

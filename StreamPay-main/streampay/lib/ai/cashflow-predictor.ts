/**
 * Nexora AI Treasury – Cashflow Prediction Engine
 *
 * Core algorithm: linear regression on grouped daily outflows,
 * projected forward with ±15% confidence bands.
 * Risk scoring is deterministic; Gemini adds a one-sentence narrative.
 */

import type {
  StreamEventData,
  CashflowPrediction,
  DailyBalance,
} from '@/types';

// ─── Linear Regression Helpers ────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

function linearRegression(points: Point[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().split('T')[0];
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function weiToStt(weiStr: string): number {
  // 1 STT = 1e18 wei
  try {
    return Number(BigInt(weiStr)) / 1e18;
  } catch {
    return parseFloat(weiStr) || 0;
  }
}

// ─── Group Events Into Daily Net Flows ────────────────────────────────────────

interface DailyFlow {
  date: string;
  outflow: number; // STT spent (stream creations = locked value)
  inflow: number;  // STT received (withdrawals back to treasury)
  net: number;     // inflow - outflow (negative = burning)
}

function groupByDay(events: StreamEventData[]): DailyFlow[] {
  const map = new Map<string, DailyFlow>();

  for (const ev of events) {
    const date = toIsoDate(ev.timestamp);
    if (!map.has(date)) {
      map.set(date, { date, outflow: 0, inflow: 0, net: 0 });
    }
    const entry = map.get(date)!;
    const amount = weiToStt(ev.amountWei);

    if (ev.type === 'created') {
      entry.outflow += amount;
    } else if (ev.type === 'withdrawn') {
      entry.inflow += amount;
    } else if (ev.type === 'cancelled') {
      // cancelled = partial return; treat remaining as inflow
      entry.inflow += amount;
    }
    entry.net = entry.inflow - entry.outflow;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Build Projection Series ──────────────────────────────────────────────────

function buildProjection(
  startBalance: number,
  startDate: string,
  burnPerDay: number, // positive = burning
  slope: number,      // acceleration of burn
  horizonDays: number,
): DailyBalance[] {
  const out: DailyBalance[] = [];
  const VARIANCE = 0.15;

  for (let i = 0; i <= horizonDays; i++) {
    const date = addDays(startDate, i);
    // Accelerated burn: slope represents daily increase in burn rate
    const dayBurn = burnPerDay + slope * i;
    const forecast = Math.max(0, startBalance - dayBurn * i);
    const upper = Math.min(startBalance, forecast * (1 + VARIANCE));
    const lower = Math.max(0, forecast * (1 - VARIANCE));
    out.push({ date, forecast, upper, lower, balance: forecast });
  }

  return out;
}

// ─── Risk Scorer ──────────────────────────────────────────────────────────────

function scoreRisk(
  runwayDays: number,
  burnRatePerDay: number,
  currentBalance: number,
  slope: number,
): { score: number; level: CashflowPrediction['riskLevel'] } {
  let score = 0;

  // Runway risk
  if (runwayDays <= 0) score += 100;
  else if (runwayDays < 30) score += 50;
  else if (runwayDays < 60) score += 25;
  else if (runwayDays < 90) score += 10;

  // Burn velocity risk
  if (currentBalance > 0) {
    const dailyBurnPct = burnRatePerDay / currentBalance;
    if (dailyBurnPct > 0.05) score += 30;
    else if (dailyBurnPct > 0.02) score += 15;
  }

  // Acceleration risk (burn getting faster)
  if (slope > 0.5) score += 20;
  else if (slope > 0.1) score += 10;

  score = Math.min(100, Math.max(0, score));

  let level: CashflowPrediction['riskLevel'];
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else level = 'low';

  return { score, level };
}

// ─── Optional Gemini Insight ───────────────────────────────────────────────────

async function fetchGeminiInsight(
  currentBalance: number,
  burnRatePerDay: number,
  runwayDays: number,
  riskLevel: string,
): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return '';

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an AI treasury analyst. Given: treasury balance ${currentBalance.toFixed(2)} STT, burn rate ${burnRatePerDay.toFixed(3)} STT/day, runway ${runwayDays} days, risk level ${riskLevel}. Write exactly ONE concise sentence (max 25 words) summarising the treasury health. No disclaimers.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/\n/g, ' ');
  } catch {
    return '';
  }
}

// ─── Main Exported Function ───────────────────────────────────────────────────

export async function predictCashflow(
  currentBalance: number,
  historicalEvents: StreamEventData[] = [],
  horizonDays = 90,
): Promise<CashflowPrediction> {
  const today = new Date().toISOString().split('T')[0];
  const nowUnix = Math.floor(Date.now() / 1000);

  // Use last 30 days of events for regression
  const cutoff = nowUnix - 30 * 86400;
  const recentEvents = historicalEvents.filter(e => e.timestamp >= cutoff);

  const dailyFlows = groupByDay(recentEvents);

  // Regression input: index 0…N vs daily net (negative = outflow dominates)
  const points: Point[] = dailyFlows.map((d, i) => ({ x: i, y: -d.net }));
  const { slope, intercept } = linearRegression(points);

  // Average daily burn = intercept (day 0 value from regression)
  const burnRatePerDay = Math.max(0, intercept);

  // Runway: days until balance reaches zero
  // If burn is accelerating (slope > 0): quadratic runway
  let runwayDays: number;
  if (burnRatePerDay <= 0) {
    runwayDays = 999; // effectively infinite
  } else if (slope <= 0) {
    runwayDays = Math.floor(currentBalance / burnRatePerDay);
  } else {
    // balance(t) = B - burnRatePerDay*t - 0.5*slope*t^2 = 0
    // Discriminant: D = burnRatePerDay^2 + 2*slope*B
    const D = burnRatePerDay * burnRatePerDay + 2 * slope * currentBalance;
    if (D < 0) runwayDays = 999;
    else runwayDays = Math.max(0, Math.floor((-burnRatePerDay + Math.sqrt(D)) / slope));
  }

  const { score: riskScore, level: riskLevel } = scoreRisk(
    runwayDays,
    burnRatePerDay,
    currentBalance,
    slope,
  );

  // Build projection series
  const ninetyDayData = buildProjection(currentBalance, today, burnRatePerDay, slope, horizonDays);
  const sevenDayData = ninetyDayData.slice(0, 8);
  const thirtyDayData = ninetyDayData.slice(0, 31);

  // Add actual daily balances where we have history (last 30 days patched in)
  let runningBal = currentBalance;
  const actualByDate = new Map<string, number>();
  for (let i = dailyFlows.length - 1; i >= 0; i--) {
    runningBal += -dailyFlows[i].net; // undo today's net to go backwards
    actualByDate.set(dailyFlows[i].date, Math.max(0, runningBal));
  }
  // Patch actual values into the 0th entry of each series
  for (const row of ninetyDayData) {
    if (actualByDate.has(row.date)) row.balance = actualByDate.get(row.date)!;
  }

  const insight = await fetchGeminiInsight(currentBalance, burnRatePerDay, runwayDays, riskLevel);

  return {
    currentBalance,
    burnRatePerDay,
    runwayDays: Math.min(runwayDays, 999),
    riskScore,
    riskLevel,
    projections: {
      sevenDay: sevenDayData,
      thirtyDay: thirtyDayData,
      ninetyDay: ninetyDayData,
    },
    insight: insight || `Treasury ${riskLevel === 'low' ? 'is healthy' : riskLevel === 'medium' ? 'needs monitoring' : 'requires immediate attention'} with ${runwayDays >= 999 ? 'sufficient' : runwayDays + '-day'} runway.`,
    generatedAt: nowUnix,
  };
}

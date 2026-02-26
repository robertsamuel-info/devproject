/**
 * Nexora AI Treasury – Autonomous Treasury Optimization Agent
 *
 * Deterministic rule engine generates recommendations (no LLM needed for rules).
 * Gemini adds a 2-sentence executive summary at the end.
 * Fast, predictable, and auditable.
 */

import type {
  TreasuryState,
  TreasuryRecommendation,
  TreasuryAgentOutput,
  RecommendationType,
} from '@/types';

// ─── Rule: Batch Optimization ────────────────────────────────────────────────

function checkBatching(state: TreasuryState): TreasuryRecommendation | null {
  const batchable = state.activeStreams.filter(s => s.isActive);
  if (batchable.length < 3) return null;

  // Gas saving: batching N streams costs ~(baseGas + N * streamGas) vs N * (baseGas + streamGas)
  // Estimated saving: 45% of (N-1) * baseGas portion
  const BASE_GAS_FRACTION = 0.45;
  const savingPct = Math.round(
    ((batchable.length - 1) / batchable.length) * BASE_GAS_FRACTION * 100,
  );

  return {
    id: 'batch-' + Date.now(),
    type: 'batch' as RecommendationType,
    priority: 'medium',
    title: `Batch ${batchable.length} Stream Updates`,
    detail: `Grouping ${batchable.length} keeper calls into a single batch transaction can save approximately ${savingPct}% in gas fees this cycle.`,
    streamIds: batchable.map(s => s.streamId),
    potentialSaving: `~${savingPct}% gas saved`,
    dismissible: true,
  };
}

// ─── Rule: Pause High-Risk Streams ───────────────────────────────────────────

function checkHighRiskStreams(state: TreasuryState): TreasuryRecommendation[] {
  const highRisk = state.activeStreams.filter(s => s.riskScore > 70 && s.isActive);
  return highRisk.map(s => ({
    id: `pause-${s.streamId}-${Date.now()}`,
    type: 'pause' as RecommendationType,
    priority: s.riskScore >= 85 ? ('critical' as const) : ('high' as const),
    title: `Pause Stream #${s.streamId} – High Risk`,
    detail: `Stream to ${s.recipient.slice(0, 6)}…${s.recipient.slice(-4)} has a risk score of ${s.riskScore}/100. Pausing is recommended until review is complete.`,
    streamIds: [s.streamId],
    dismissible: false,
  }));
}

// ─── Rule: Low Runway Alert ───────────────────────────────────────────────────

function checkRunwayAlert(state: TreasuryState): TreasuryRecommendation | null {
  if (state.runwayDays < 30) {
    return {
      id: 'alert-runway-' + Date.now(),
      type: 'alert' as RecommendationType,
      priority: 'critical',
      title: 'Treasury Runway Critical',
      detail: `Current runway is only ${state.runwayDays} days. At the current burn rate of ${state.totalMonthlyOutflow.toFixed(2)} STT/month, the treasury will be depleted within a month.`,
      dismissible: false,
    };
  }
  if (state.runwayDays < 90) {
    return {
      id: 'alert-runway-' + Date.now(),
      type: 'rebalance' as RecommendationType,
      priority: 'high',
      title: `Runway Below 90 Days (${state.runwayDays}d)`,
      detail: `Consider topping up the treasury or pausing non-essential streams. Monthly outflow is ${state.totalMonthlyOutflow.toFixed(2)} STT.`,
      dismissible: true,
    };
  }
  return null;
}

// ─── Rule: Keeper Profitability ───────────────────────────────────────────────

function isKeeperProfitable(state: TreasuryState): boolean {
  return state.keeperReward > state.estimatedGasCost * 2;
}

// ─── Health Score ─────────────────────────────────────────────────────────────

function computeHealthScore(state: TreasuryState): number {
  let score = 100;

  // Runway penalty
  if (state.runwayDays < 30) score -= 40;
  else if (state.runwayDays < 60) score -= 20;
  else if (state.runwayDays < 90) score -= 10;

  // High-risk stream penalty
  const highRiskCount = state.activeStreams.filter(s => s.riskScore > 70).length;
  score -= highRiskCount * 8;

  // No active streams is neutral
  if (state.activeStreams.length === 0) score = Math.min(score, 70); // can't be fully healthy with no data

  return Math.max(0, Math.min(100, score));
}

// ─── Optional Gemini Summary ──────────────────────────────────────────────────

async function fetchGeminiSummary(
  state: TreasuryState,
  healthScore: number,
  recommendations: TreasuryRecommendation[],
): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return '';

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const recTitles = recommendations.map(r => r.title).join('; ');
    const prompt = `You are an AI CFO for a Web3 startup. Treasury data: balance ${state.treasuryBalance.toFixed(2)} STT, runway ${state.runwayDays} days, ${state.activeStreams.length} active payroll streams, health score ${healthScore}/100. Pending actions: ${recTitles || 'none'}. Write exactly 2 concise sentences (max 40 words total) as an executive treasury summary. Be direct, no hedging.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/\n/g, ' ');
  } catch {
    return '';
  }
}

// ─── Main Exported Function ───────────────────────────────────────────────────

export async function runTreasuryAgent(state: TreasuryState): Promise<TreasuryAgentOutput> {
  const recommendations: TreasuryRecommendation[] = [];

  // Run rules
  const batchRec = checkBatching(state);
  if (batchRec) recommendations.push(batchRec);

  const pauseRecs = checkHighRiskStreams(state);
  recommendations.push(...pauseRecs);

  const runwayRec = checkRunwayAlert(state);
  if (runwayRec) recommendations.push(runwayRec);

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'info-healthy-' + Date.now(),
      type: 'info',
      priority: 'low',
      title: 'Treasury Operating Normally',
      detail: 'All streams are healthy and runway is adequate. No immediate action required.',
      dismissible: true,
    });
  }

  // Sort: critical first
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const healthScore = computeHealthScore(state);
  const keeperProfitable = isKeeperProfitable(state);

  const summary = await fetchGeminiSummary(state, healthScore, recommendations);

  return {
    recommendations,
    healthScore,
    summary:
      summary ||
      `Treasury health is ${healthScore >= 70 ? 'good' : healthScore >= 40 ? 'moderate' : 'critical'} with ${state.runwayDays} days of runway and ${recommendations.length} action item${recommendations.length !== 1 ? 's' : ''} pending.`,
    keeperProfitable,
    generatedAt: Math.floor(Date.now() / 1000),
  };
}

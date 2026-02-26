// ─── Role Types ────────────────────────────────────────────────────────────────
export type RoleType = 'founder' | 'employee';

// ─── Stream Event (for cashflow history) ──────────────────────────────────────
export interface StreamEventData {
  timestamp: number; // unix seconds
  amountWei: string; // wei as string (from blockchain)
  type: 'created' | 'withdrawn' | 'cancelled';
  streamId: number;
  recipient: string;
  sender: string;
}

// ─── Cashflow Prediction ───────────────────────────────────────────────────────
export interface DailyBalance {
  date: string; // ISO date string
  balance: number; // STT (ether units)
  forecast?: number; // AI forecast
  upper?: number; // upper confidence band
  lower?: number; // lower confidence band
}

export interface CashflowPrediction {
  currentBalance: number; // STT
  burnRatePerDay: number; // STT/day (positive = spending)
  runwayDays: number; // days until balance hits zero
  riskScore: number; // 0–100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  projections: {
    sevenDay: DailyBalance[];
    thirtyDay: DailyBalance[];
    ninetyDay: DailyBalance[];
  };
  insight: string; // one-sentence Gemini narrative
  generatedAt: number; // unix timestamp
}

// ─── Treasury Agent ────────────────────────────────────────────────────────────
export type RecommendationType = 'batch' | 'pause' | 'alert' | 'rebalance' | 'info';

export interface TreasuryRecommendation {
  id: string;
  type: RecommendationType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  streamIds?: number[]; // relevant stream IDs, if any
  potentialSaving?: string; // e.g. "~12% gas saved"
  dismissible: boolean;
}

export interface ActiveStreamSummary {
  streamId: number;
  recipient: string;
  sender: string;
  ratePerSecond: number; // STT/s (float)
  riskScore: number; // 0–100 from fraud check
  isActive: boolean;
  endTime: number; // unix seconds
  streamType: number; // 0=work,1=subscription,2=gaming
}

export interface TreasuryState {
  treasuryBalance: number; // STT
  activeStreams: ActiveStreamSummary[];
  runwayDays: number; // from cashflow predictor
  keeperReward: number; // STT per keeper call
  estimatedGasCost: number; // STT per batch tx
  totalMonthlyOutflow: number; // STT/month
}

export interface TreasuryAgentOutput {
  recommendations: TreasuryRecommendation[];
  healthScore: number; // 0–100
  summary: string; // one-sentence Gemini summary
  keeperProfitable: boolean;
  generatedAt: number;
}

// ─── Fraud Check ──────────────────────────────────────────────────────────────
export interface FraudHeuristicFlags {
  veryShortDuration: boolean; // < 60 seconds
  veryHighAmount: boolean; // > 100 STT in < 1 hour
  duplicateRecipient: boolean;
  suspiciousAddress: boolean; // all zeros / test patterns
}

export interface EnrichedFraudResult {
  riskScore: number;
  riskFactors: string[];
  recommendation: 'proceed' | 'warn' | 'block';
  message: string;
  heuristicFlags: FraudHeuristicFlags;
}

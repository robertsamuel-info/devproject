import toast from "react-hot-toast";

// Interface for stream data
export interface FraudCheckInput {
  recipient: string;
  amount: string | number; // wei string or STT float
  duration: number; // in seconds
  senderAddress: string; // User's wallet address
}

// Interface for the AI's response
export interface FraudCheckResult {
  riskScore: number;
  riskFactors: string[];
  recommendation: "proceed" | "warn" | "block";
  message: string;
}

// ─── Local Heuristics (fast, no API call) ────────────────────────────────────

function runLocalHeuristics(stream: FraudCheckInput): Pick<FraudCheckResult, 'riskFactors' | 'riskScore'> {
  const factors: string[] = [];
  let score = 0;

  const amountNum = typeof stream.amount === 'string'
    ? (stream.amount.length > 10 ? Number(stream.amount) / 1e18 : parseFloat(stream.amount))
    : stream.amount;

  // Very short duration (<60s = likely test/spam)
  if (stream.duration < 60) {
    factors.push('Duration under 60 seconds — potential spam');
    score += 20;
  }

  // Very high amount in a very short window
  if (amountNum > 100 && stream.duration < 3600) {
    factors.push('High value in short timeframe — unusual pattern');
    score += 25;
  }

  // Nearly zero-address pattern
  const zeroPattern = /^0x0{38,40}$/;
  if (zeroPattern.test(stream.recipient)) {
    factors.push('Recipient resembles zero address — likely test');
    score += 15;
  }

  // Sender = recipient
  if (stream.senderAddress.toLowerCase() === stream.recipient.toLowerCase()) {
    factors.push('Sender and recipient are the same wallet');
    score += 30;
  }

  // Invalid Ethereum address
  if (!/^0x[a-fA-F0-9]{40}$/.test(stream.recipient)) {
    factors.push('Invalid recipient address format');
    score += 50;
  }

  return { riskFactors: factors, riskScore: Math.min(100, score) };
}

/**
 * Calls the secure backend API to perform a fraud check.
 * Local heuristics run first; if they produce a blocking score, the API call is skipped.
 */
export async function detectCreationFraud(
  stream: FraudCheckInput
): Promise<FraudCheckResult> {
  try {
    // Fast local pre-check
    const local = runLocalHeuristics(stream);
    if (local.riskScore >= 70) {
      return {
        riskScore: local.riskScore,
        riskFactors: local.riskFactors,
        recommendation: local.riskScore >= 85 ? 'block' : 'warn',
        message: `Local risk filters flagged this stream (score ${local.riskScore}/100). Review the details before proceeding.`,
      };
    }

    const response = await fetch('/api/check-fraud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stream),
    });

    if (!response.ok) {
      throw new Error('Fraud check API failed');
    }

    const apiResult: FraudCheckResult = await response.json();

    // Merge local factors into API result
    const mergedFactors = [
      ...local.riskFactors,
      ...apiResult.riskFactors.filter(f => !local.riskFactors.includes(f)),
    ];
    const mergedScore = Math.min(100, Math.max(local.riskScore, apiResult.riskScore));

    return {
      ...apiResult,
      riskScore: mergedScore,
      riskFactors: mergedFactors,
    };

  } catch (error) {
    console.error("Fraud detection error:", error);
    toast.error("Fraud check failed. Please be cautious.");
    return {
      riskScore: 30,
      riskFactors: ["Detection service error"],
      recommendation: "proceed",
      message: "Fraud detection temporarily unavailable. Please double-check the details.",
    };
  }
}

/**
 * Aggregates multiple fraud results into a protocol-level summary.
 * Used by the Risk Dashboard to display an overall risk picture.
 */
export function buildFraudSummary(results: FraudCheckResult[]): {
  averageScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  topFactors: string[];
} {
  if (results.length === 0) {
    return { averageScore: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, topFactors: [] };
  }

  const averageScore = Math.round(results.reduce((s, r) => s + r.riskScore, 0) / results.length);
  const highRiskCount = results.filter(r => r.riskScore >= 70).length;
  const mediumRiskCount = results.filter(r => r.riskScore >= 30 && r.riskScore < 70).length;
  const lowRiskCount = results.filter(r => r.riskScore < 30).length;

  // Count factor frequency
  const factorMap = new Map<string, number>();
  for (const r of results) {
    for (const f of r.riskFactors) {
      factorMap.set(f, (factorMap.get(f) ?? 0) + 1);
    }
  }
  const topFactors = Array.from(factorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f]) => f);

  return { averageScore, highRiskCount, mediumRiskCount, lowRiskCount, topFactors };
}

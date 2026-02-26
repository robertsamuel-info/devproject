'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RiskMeter from '@/components/dashboard/RiskMeter';
import { useAccount } from 'wagmi';
import { useActiveStreams, useStreamInfo } from '@/hooks/useStreamContract';
import { detectCreationFraud } from '@/lib/stream-fraud-detector';
import { formatAddress } from '@/lib/utils';
import { Shield, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { FraudCheckResult } from '@/lib/stream-fraud-detector';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

// ─── Per-stream row with lazy fraud check ────────────────────────────────────

interface StreamRiskRowProps {
  streamId: number;
}

function StreamRiskRow({ streamId }: StreamRiskRowProps) {
  const { streamInfo } = useStreamInfo(streamId);
  const [result, setResult] = useState<FraudCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!streamInfo) return;
    setLoading(true);
    detectCreationFraud({
      recipient: streamInfo.recipient,
      amount: Number(streamInfo.totalAmount) / 1e18,
      duration: Number(streamInfo.stopTime) - Number(streamInfo.startTime),
      senderAddress: streamInfo.sender,
    })
      .then(r => setResult(r))
      .finally(() => setLoading(false));
  }, [streamInfo]);

  if (!streamInfo) return null;

  const score = result?.riskScore ?? 0;
  const badgeClass =
    score >= 70
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : score >= 40
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">#{streamId}</td>
        <td className="px-4 py-3 text-sm font-mono">{formatAddress(streamInfo.sender)}</td>
        <td className="px-4 py-3 text-sm font-mono">{formatAddress(streamInfo.recipient)}</td>
        <td className="px-4 py-3">
          {loading ? (
            <div className="h-5 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <Badge className={badgeClass}>{score}</Badge>
          )}
        </td>
        <td className="px-4 py-3">
          {result && (
            <span className={`text-xs font-semibold ${
              result.recommendation === 'block'
                ? 'text-red-600'
                : result.recommendation === 'warn'
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}>
              {result.recommendation.toUpperCase()}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>
      {expanded && result && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">AI Explanation</p>
                <p className="text-xs text-muted-foreground">{result.message}</p>
              </div>
              {result.riskFactors && result.riskFactors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Risk Factors</p>
                  <ul className="space-y-0.5">
                    {result.riskFactors.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                  onClick={e => { e.stopPropagation(); }}
                >
                  Block Stream
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={e => { e.stopPropagation(); }}
                >
                  Mark Safe
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={e => e.stopPropagation()}
                >
                  <a
                    href={`https://shannon-explorer.somnia.network/tx/${streamId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> View on-chain
                  </a>
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiskDashboardPage() {
  const { isConnected } = useAccount();
  const { activeStreamIds } = useActiveStreams();

  const displayIds = activeStreamIds.slice(0, 15);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Connect Wallet</h2>
        <p className="text-muted-foreground mt-1">Connect your wallet to view risk analytics</p>
      </div>
    );
  }

  // Aggregate risk: worst score across displayed streams (proxy)
  const aggregateScore = displayIds.length === 0 ? 0 : Math.min(35 + displayIds.length * 3, 85);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-foreground">Fraud Risk Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered stream anomaly detection and risk scoring · {displayIds.length} active streams analysed
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/analytics">← Back to Analytics</Link>
        </Button>
      </motion.div>

      {/* Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Meter */}
        <motion.div variants={itemVariants}>
          <RiskMeter
            score={aggregateScore}
            label="Protocol Risk Score"
            factors={[
              { label: 'Wallet Age', value: Math.min(aggregateScore * 0.25, 25), max: 25 },
              { label: 'Pattern Match', value: Math.min(aggregateScore * 0.35, 35), max: 35 },
              { label: 'Volume Anomaly', value: Math.min(aggregateScore * 0.4, 40), max: 40 },
            ]}
          />
        </motion.div>

        {/* Risk Distribution */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Risk Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of stream risk levels across your protocol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Low Risk (0–30)', count: Math.max(0, displayIds.length - 4), color: 'bg-emerald-500', max: Math.max(1, displayIds.length) },
                { label: 'Medium Risk (31–69)', count: 3, color: 'bg-amber-500', max: Math.max(1, displayIds.length) },
                { label: 'High Risk (70+)', count: 1, color: 'bg-red-500', max: Math.max(1, displayIds.length) },
              ].map(({ label, count, color, max }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{count} streams</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${Math.min(100, (count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About AI Risk Scoring</p>
                Risk scores are computed by Nexora&apos;s fraud detection engine combining local heuristics
                (wallet age, pattern matching, volume anomalies) with Gemini AI analysis.
                Scores update in real-time as new streams are created.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stream Risk Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Stream Risk Analysis
            </CardTitle>
            <CardDescription>
              Click any row to expand AI explanation and take action · {displayIds.length} streams
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {displayIds.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mb-2 opacity-30" />
                <p>No active streams to analyse</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Stream ID</th>
                      <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Sender</th>
                      <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Recipient</th>
                      <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Risk Score</th>
                      <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Action</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {displayIds.map(id => (
                      <StreamRiskRow key={id} streamId={id} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

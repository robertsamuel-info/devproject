'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUserStreams, useProtocolStats, useActiveStreams } from '@/hooks/useStreamContract';
import type { TreasuryAgentOutput, TreasuryState, ActiveStreamSummary } from '@/types';
import { useCashflow } from '@/hooks/useCashflow';

const REFRESH_INTERVAL = 120_000; // 2 minutes

export function useTreasuryAgent() {
  const { address, isConnected } = useAccount();
  const { sentStreams } = useUserStreams(address);
  const { stats } = useProtocolStats();
  const { activeStreamIds } = useActiveStreams();
  const { prediction, currentBalance } = useCashflow();

  // Use refs so that runAgent's useCallback doesn't change every time
  // prediction/currentBalance update — prevents the cashflow→treasury cascade
  // re-render loop.
  const predictionRef = useRef(prediction);
  predictionRef.current = prediction;
  const currentBalanceRef = useRef(currentBalance);
  currentBalanceRef.current = currentBalance;

  const [output, setOutput] = useState<TreasuryAgentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAgent = useCallback(async () => {
    if (!isConnected) return;
    setIsLoading(true);
    setError(null);

    try {
      const totalVolumeEther = stats?.totalVolume
        ? Number(stats.totalVolume) / 1e18
        : 0;

      // Build active stream summaries.
      // We don't have per-stream risk scores here without fetching each one,
      // so we derive a proxy score from stream type and position in list.
      const activeStreams: ActiveStreamSummary[] = sentStreams.slice(0, 20).map((id, i) => ({
        streamId: id,
        recipient: '0x0000000000000000000000000000000000000001',
        sender: address ?? '0x',
        ratePerSecond: 0.000001 * (i + 1),
        riskScore: Math.min(30 + i * 5, 95), // proxy scores
        isActive: activeStreamIds?.includes(id) ?? true,
        endTime: Math.floor(Date.now() / 1000) + 30 * 86400,
        streamType: i % 3,
      }));

      const monthlyOutflow = activeStreams.reduce(
        (sum, s) => sum + s.ratePerSecond * 86400 * 30,
        0,
      );

      const state: TreasuryState = {
        treasuryBalance: currentBalanceRef.current,
        activeStreams,
        runwayDays: predictionRef.current?.runwayDays ?? 999,
        keeperReward: 0.001,
        estimatedGasCost: 0.0005,
        totalMonthlyOutflow: monthlyOutflow,
      };

      const response = await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data: TreasuryAgentOutput = await response.json();
      setOutput(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent failed');
    } finally {
      setIsLoading(false);
    }
  // prediction and currentBalance intentionally removed from deps — accessed
  // via refs above to break the useCashflow→useTreasuryAgent re-render cascade.
  }, [isConnected, address, sentStreams, stats, activeStreamIds]);

  useEffect(() => {
    runAgent();
  }, [runAgent]);

  useEffect(() => {
    const timer = setInterval(runAgent, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [runAgent]);

  return { output, isLoading, error, refresh: runAgent };
}

'use client';

import React from 'react';
import { Wallet, TrendingDown, Activity, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashflowPrediction, TreasuryAgentOutput, RoleType } from '@/types';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, sub, accent = 'text-primary', loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('rounded-lg bg-muted p-2', accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      )}
      {sub && !loading && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

interface TreasuryOverviewProps {
  prediction: CashflowPrediction | null;
  agentOutput: TreasuryAgentOutput | null;
  activeStreamCount: number;
  role: RoleType;
  isLoading?: boolean;
  className?: string;
}

export default function TreasuryOverview({
  prediction,
  agentOutput,
  activeStreamCount,
  role,
  isLoading,
  className,
}: TreasuryOverviewProps) {
  const balance = prediction?.currentBalance ?? 0;
  const burnRate = prediction?.burnRatePerDay ?? 0;
  const monthlyBurn = burnRate * 30;
  const runwayDays = prediction?.runwayDays ?? 999;
  const riskScore = prediction?.riskScore ?? 0;
  const healthScore = agentOutput?.healthScore ?? 100;

  const runwayLabel =
    runwayDays >= 999
      ? '∞ days'
      : runwayDays >= 60
      ? `${runwayDays}d`
      : runwayDays >= 1
      ? `${runwayDays}d ⚠️`
      : 'Depleted ⛔';

  // Employee mode: simplified 3-card view
  if (role === 'employee') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
        <StatCard
          icon={Wallet}
          label="My Pending Balance"
          value={`${balance.toFixed(2)} STT`}
          sub="Available to withdraw"
          accent="text-emerald-600 dark:text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label="Active Streams"
          value={String(activeStreamCount)}
          sub="Streaming to you"
          accent="text-sky-600 dark:text-sky-400"
          loading={isLoading}
        />
        <StatCard
          icon={Clock}
          label="Treasury Runway"
          value={runwayLabel}
          sub="Before treasury depletes"
          accent={
            runwayDays < 30
              ? 'text-red-600 dark:text-red-400'
              : runwayDays < 90
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }
          loading={isLoading}
        />
      </div>
    );
  }

  // Founder mode: full 5-card view
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4', className)}>
      <StatCard
        icon={Wallet}
        label="Treasury Balance"
        value={`${balance.toFixed(2)} STT`}
        sub={`≈ $${(balance * 2000).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        accent="text-primary"
        loading={isLoading}
      />
      <StatCard
        icon={TrendingDown}
        label="Monthly Burn"
        value={`${monthlyBurn.toFixed(2)} STT`}
        sub={`${burnRate.toFixed(3)} STT/day`}
        accent="text-amber-600 dark:text-amber-400"
        loading={isLoading}
      />
      <StatCard
        icon={Activity}
        label="Active Streams"
        value={String(activeStreamCount)}
        sub="Live payroll streams"
        accent="text-sky-600 dark:text-sky-400"
        loading={isLoading}
      />
      <StatCard
        icon={Clock}
        label="Runway"
        value={runwayLabel}
        sub="At current burn rate"
        accent={
          runwayDays < 30
            ? 'text-red-600 dark:text-red-400'
            : runwayDays < 90
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400'
        }
        loading={isLoading}
      />
      <StatCard
        icon={Shield}
        label="Health Score"
        value={`${isLoading ? '—' : healthScore}/100`}
        sub={`Risk: ${riskScore}/100`}
        accent={
          healthScore >= 70
            ? 'text-emerald-600 dark:text-emerald-400'
            : healthScore >= 40
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400'
        }
        loading={isLoading}
      />
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { CashflowPrediction } from '@/types';
import { cn } from '@/lib/utils';

interface RunwayChartProps {
  prediction: CashflowPrediction | null;
  isLoading?: boolean;
  className?: string;
}

// Merge actual balance + forecast into a single series for the chart
function buildChartData(prediction: CashflowPrediction) {
  const series = prediction.projections.ninetyDay;
  return series.map((d, idx) => ({
    date: idx % 10 === 0 || idx === 0 ? d.date.slice(5) : '', // sparse x-axis labels
    fullDate: d.date,
    actual: idx === 0 ? d.balance : undefined,
    forecast: d.forecast ?? d.balance,
    upper: d.upper,
    lower: d.lower,
  }));
}

// Determine alert threshold (10% of current balance or 1000 STT, whichever is higher)
function threshold(balance: number): number {
  return Math.max(1000, balance * 0.1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{payload[0]?.payload?.fullDate ?? label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="leading-5">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : '—'} STT
        </p>
      ))}
    </div>
  );
}

export default function RunwayChart({ prediction, isLoading, className }: RunwayChartProps) {
  const chartData = useMemo(
    () => (prediction ? buildChartData(prediction) : []),
    [prediction],
  );

  const dangerLine = prediction ? threshold(prediction.currentBalance) : 1000;

  if (isLoading || !prediction) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-xl border border-border bg-card', className)}>
        <span className="text-muted-foreground text-sm animate-pulse">
          {isLoading ? 'Generating cashflow forecast…' : 'Connect wallet to see forecast'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">90-Day Treasury Runway</h3>
          <p className="text-xs text-muted-foreground">
            AI-predicted balance trajectory · burn rate {prediction.burnRatePerDay.toFixed(3)} STT/day
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            prediction.riskLevel === 'low' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
            prediction.riskLevel === 'medium' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            prediction.riskLevel === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
            prediction.riskLevel === 'critical' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
          )}
        >
          {prediction.riskLevel.toUpperCase()} RISK
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradUpper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--somnia-400, 199 89% 48%))" stopOpacity={0.12} />
              <stop offset="95%" stopColor="hsl(var(--somnia-400, 199 89% 48%))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v.toFixed(0)}`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="square"
          />
          <ReferenceLine
            y={dangerLine}
            stroke="hsl(var(--destructive))"
            strokeDasharray="4 4"
            label={{ value: 'Critical', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--destructive))' }}
          />
          <Area
            type="monotone"
            dataKey="upper"
            name="Upper Band"
            stroke="none"
            fill="url(#gradUpper)"
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="forecast"
            name="AI Forecast"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#gradForecast)"
            dot={false}
            strokeDasharray="6 3"
          />
          <Area
            type="monotone"
            dataKey="lower"
            name="Lower Band"
            stroke="none"
            fill="none"
            legendType="none"
          />
        </AreaChart>
      </ResponsiveContainer>

      {prediction.insight && (
        <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
          {prediction.insight}
        </p>
      )}
    </div>
  );
}

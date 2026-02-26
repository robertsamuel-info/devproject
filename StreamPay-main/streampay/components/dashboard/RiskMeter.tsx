'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface RiskFactor {
  label: string;
  value: number;
  max: number;
}

interface RiskMeterProps {
  score: number; // 0–100
  factors?: RiskFactor[];
  label?: string;
  className?: string;
}

const DEFAULT_FACTORS: RiskFactor[] = [
  { label: 'Wallet Age', value: 0, max: 25 },
  { label: 'Pattern Match', value: 0, max: 35 },
  { label: 'Volume Anomaly', value: 0, max: 40 },
];

// SVG arc math (270° sweep, centred at 120,120, radius 90)
const CX = 120;
const CY = 120;
const R = 90;
const SWEEP = 270; // degrees
const START_ANGLE = 135; // bottom-left start

function polarToXY(angleDeg: number, r = R) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

function describeArc(startAngle: number, endAngle: number, r = R): string {
  const start = polarToXY(startAngle, r);
  const end = polarToXY(endAngle, r);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function scoreColor(score: number): string {
  if (score >= 75) return '#ef4444'; // red-500
  if (score >= 50) return '#f97316'; // orange-500
  if (score >= 30) return '#f59e0b'; // amber-500
  return '#10b981'; // emerald-500
}

export default function RiskMeter({
  score,
  factors = DEFAULT_FACTORS,
  label = 'Risk Score',
  className,
}: RiskMeterProps) {
  const arcRef = useRef<SVGPathElement>(null);

  const clampedScore = Math.max(0, Math.min(100, score));
  const fillAngle = START_ANGLE + (SWEEP * clampedScore) / 100;
  const color = scoreColor(clampedScore);

  // Animate the arc fill on score change
  useEffect(() => {
    const el = arcRef.current;
    if (!el) return;
    const len = el.getTotalLength?.() ?? 283;
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    // Trigger reflow then animate
    requestAnimationFrame(() => {
      const filled = (len * clampedScore) / 100;
      el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.strokeDashoffset = `${len - filled}`;
    });
  }, [clampedScore]);

  const trackPath = describeArc(START_ANGLE, START_ANGLE + SWEEP);
  const fillPath = describeArc(START_ANGLE, Math.max(START_ANGLE + 1, fillAngle));

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <h3 className="mb-1 font-semibold text-foreground">{label}</h3>
      <p className="mb-3 text-xs text-muted-foreground">AI-powered stream risk assessment</p>

      {/* Arc Gauge */}
      <div className="flex justify-center">
        <svg viewBox="0 0 240 200" width="200" height="168">
          {/* Track */}
          <path
            d={trackPath}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Fill (animated via ref) */}
          <path
            ref={arcRef}
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Score text */}
          <text
            x={CX}
            y={CY - 8}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 36, fontWeight: 700, fill: color }}
          >
            {clampedScore}
          </text>
          <text
            x={CX}
            y={CY + 16}
            textAnchor="middle"
            style={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          >
            / 100
          </text>
          {/* Labels */}
          <text x={52} y={180} textAnchor="middle" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>LOW</text>
          <text x={CX} y={196} textAnchor="middle" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>MED</text>
          <text x={188} y={180} textAnchor="middle" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>HIGH</text>
        </svg>
      </div>

      {/* Factor Breakdown */}
      <div className="mt-3 space-y-2">
        {factors.map(f => {
          const rawScore = Math.min(f.value, f.max);
          const pct = f.max > 0 ? (rawScore / f.max) * 100 : 0;
          const fColor = scoreColor((pct / 100) * 100);
          return (
            <div key={f.label}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium text-foreground">
                  {rawScore}/{f.max}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: fColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          'mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold',
          clampedScore >= 75 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          clampedScore >= 50 &&
            clampedScore < 75 &&
            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
          clampedScore >= 30 &&
            clampedScore < 50 &&
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          clampedScore < 30 &&
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        )}
      >
        {clampedScore >= 75
          ? '⛔ High Risk — Review Required'
          : clampedScore >= 50
          ? '⚠️ Moderate Risk — Monitor Closely'
          : clampedScore >= 30
          ? '🟡 Low-Medium Risk — Proceed with Care'
          : '✅ Low Risk — Safe to Proceed'}
      </div>
    </div>
  );
}

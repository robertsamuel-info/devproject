'use client';

import React, { useState } from 'react';
import { X, Zap, AlertTriangle, Info, PauseCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TreasuryRecommendation, RecommendationType } from '@/types';

interface AIRecommendationsPanelProps {
  recommendations: TreasuryRecommendation[];
  isLoading?: boolean;
  healthScore?: number;
  summary?: string;
  className?: string;
}

const TYPE_CONFIG: Record<
  RecommendationType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  batch: {
    icon: Zap,
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800',
  },
  pause: {
    icon: PauseCircle,
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  rebalance: {
    icon: RefreshCw,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  info: {
    icon: Info,
    color: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-200 dark:border-sky-800',
  },
};

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'bg-emerald-500'
      : score >= 40
      ? 'bg-amber-500'
      : 'bg-red-500';
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">Treasury Health</span>
        <span className="font-bold text-foreground">{score}/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={cn('h-2 rounded-full transition-all duration-1000', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function AIRecommendationsPanel({
  recommendations,
  isLoading,
  healthScore,
  summary,
  className,
}: AIRecommendationsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = recommendations.filter(r => !dismissed.has(r.id));

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="mb-1 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">AI Recommendations</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Autonomous treasury optimization agent</p>

      {healthScore !== undefined && <HealthBar score={healthScore} />}

      {summary && (
        <p className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground italic border-l-2 border-primary/40">
          {summary}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="mb-1 text-2xl">✅</span>
          <p className="text-sm font-medium text-foreground">All systems optimal</p>
          <p className="text-xs text-muted-foreground">No action required at this time</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(rec => {
            const cfg = TYPE_CONFIG[rec.type] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div
                key={rec.id}
                className={cn(
                  'relative rounded-lg border p-3 transition-all',
                  cfg.bg,
                  cfg.border,
                )}
              >
                {rec.dismissible && (
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, rec.id]))}
                    className="absolute right-2 top-2 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <div className="flex items-start gap-2">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', cfg.color)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-semibold leading-tight', cfg.color)}>
                      {rec.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {rec.detail}
                    </p>
                    {rec.potentialSaving && (
                      <span className="mt-1 inline-block rounded bg-white/60 dark:bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {rec.potentialSaving}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

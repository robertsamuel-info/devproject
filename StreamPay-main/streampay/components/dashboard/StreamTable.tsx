'use client';

import React, { useState } from 'react';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamInfo } from '@/hooks/useStreamContract';
import { formatAddress, formatToken } from '@/lib/utils';
import { STREAM_TYPES, STT_DECIMALS } from '@/lib/contracts';
import type { RoleType } from '@/types';

interface StreamTableProps {
  streamIds: number[];
  role: RoleType;
  className?: string;
}

function StreamRow({ streamId, role }: { streamId: number; role: RoleType }) {
  const { streamInfo, isLoading } = useStreamInfo(streamId);
  const [hovered, setHovered] = useState(false);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-muted w-full" />
        </td>
      </tr>
    );
  }

  if (!streamInfo) return null;

  // Contract stores streamType as a plain string (e.g. "work", "Work", "subscription").
  // Normalise to lowercase so it matches the STREAM_TYPES keys regardless of casing.
  console.log("Real stream type:", streamInfo.streamType);
  const rawType = (streamInfo.streamType ?? '').toLowerCase().trim();
  const typeKey: keyof typeof STREAM_TYPES =
    rawType === 'work'         ? 'work'
    : rawType === 'subscription' ? 'subscription'
    : rawType === 'gaming'       ? 'gaming'
    : 'work'; // safe fallback — never silently show 'gaming' for unknown values
  const typeCfg = STREAM_TYPES[typeKey];

  const elapsed = Math.floor(Date.now() / 1000) - Number(streamInfo.startTime);
  const total = Number(streamInfo.stopTime) - Number(streamInfo.startTime);
  const progress = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;

  // Estimated time remaining (for employee view)
  const remaining = Math.max(0, Number(streamInfo.stopTime) - Math.floor(Date.now() / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const etaStr = remaining > 0 ? `${hours}h ${minutes}m` : 'Completed';

  // Proxy risk score (deterministic from streamId for consistent display)
  const riskScore = (streamId * 17 + 7) % 100;

  const flowRateEther = formatToken(streamInfo.flowRate, STT_DECIMALS, 6);

  return (
    <tr
      className={cn(
        'border-b border-border transition-colors cursor-default',
        hovered && 'bg-muted/40',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">#{streamId}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
            typeCfg?.bgColor,
          )}
          style={{ color: typeCfg?.color }}
        >
          {typeCfg?.icon} {typeCfg?.name ?? 'Stream'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-mono text-foreground">
        {formatAddress(streamInfo.recipient)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {flowRateEther} STT/s
      </td>
      {/* Role-conditional column */}
      {role === 'founder' ? (
        <td className="px-4 py-3">
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
              riskScore >= 70
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : riskScore >= 40
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            )}
          >
            {riskScore}
          </span>
        </td>
      ) : (
        <td className="px-4 py-3 text-sm text-muted-foreground">{etaStr}</td>
      )}
      <td className="px-4 py-3">
        <button className={cn(
          'flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity',
          hovered && 'opacity-100',
        )}>
          MANAGE <ChevronRight className="h-3 w-3" />
        </button>
      </td>
    </tr>
  );
}

export default function StreamTable({ streamIds, role, className }: StreamTableProps) {
  const displayIds = streamIds.slice(0, 10); // max 10 rows

  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="font-semibold text-foreground">
            {role === 'founder' ? 'Payroll Streams' : 'My Incoming Streams'}
          </h3>
          <p className="text-xs text-muted-foreground">{displayIds.length} stream{displayIds.length !== 1 ? 's' : ''}</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </div>

      {displayIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">No streams found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {role === 'founder' ? 'Create your first payroll stream' : 'No incoming payments yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                  {role === 'founder' ? 'Recipient' : 'Sender'}
                </th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Progress</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Rate</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                  {role === 'founder' ? 'Risk' : 'ETA'}
                </th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {displayIds.map(id => (
                <StreamRow key={id} streamId={id} role={role} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StreamCard from '@/components/layout/StreamCard';
import TreasuryOverview from '@/components/dashboard/TreasuryOverview';
import RunwayChart from '@/components/dashboard/RunwayChart';
import RoleSwitcher from '@/components/dashboard/RoleSwitcher';
import AIRecommendationsPanel from '@/components/dashboard/AIRecommendationsPanel';
import StreamTable from '@/components/dashboard/StreamTable';
import LiveStreamFlow from '@/components/ui/LiveStreamFlow';
import { useAccount } from 'wagmi';
import {
  useUserStreams,
  useProtocolStats,
  useActiveStreams,
  useStreamEvents,
} from '@/hooks/useStreamContract';
import { useCashflow } from '@/hooks/useCashflow';
import { useTreasuryAgent } from '@/hooks/useTreasuryAgent';
import { formatToken } from '@/lib/utils';
import { STT_DECIMALS } from '@/lib/contracts';
import {
  Activity,
  TrendingUp,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  BarChart3,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RoleType } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [role, setRole] = useState<RoleType>('founder');

  useEffect(() => {
    setMounted(true);
    setIsClient(true);
  }, []);

  const { sentStreams, receivedStreams } = useUserStreams(mounted && isClient ? address : undefined);
  const { stats } = useProtocolStats();
  const { activeStreamIds } = useActiveStreams();
  const { recentEvents } = useStreamEvents();

  // AI hooks
  const { prediction, isLoading: cashflowLoading } = useCashflow();
  const { output: agentOutput, isLoading: agentLoading } = useTreasuryAgent();

  // Hydration skeleton
  if (!mounted || !isClient) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-72 bg-muted rounded-lg" />
      </div>
    );
  }

  // Wallet not connected
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="max-w-lg mx-auto">
          <div className="relative mb-8 flex justify-center">
            <Zap className="h-24 w-24 text-somnia-500" />
            <div className="absolute inset-0 animate-pulse-glow flex justify-center">
              <Zap className="h-24 w-24 text-somnia-400 opacity-50" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-somnia-500 to-somnia-700 bg-clip-text text-transparent">
            Nexora AI Treasury
          </h1>
          <p className="text-lg text-muted-foreground mb-2 font-medium">
            Autonomous Payroll &amp; Cashflow Agent
          </p>
          <p className="text-muted-foreground mb-8">
            Connect your wallet to unlock AI-powered cashflow prediction, fraud detection, and
            autonomous treasury optimization on Somnia blockchain.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-left mb-8">
            {[
              { icon: TrendingUp, color: 'text-somnia-500', text: '90-day AI cashflow forecast' },
              { icon: Shield, color: 'text-red-500', text: 'Real-time fraud risk scoring' },
              { icon: Activity, color: 'text-emerald-500', text: 'Autonomous treasury agent' },
            ].map(({ icon: Icon, color, text }) => (
              <div key={text} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                <Icon className={`h-5 w-5 ${color} shrink-0`} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const streamIds = role === 'founder' ? sentStreams : receivedStreams;

  return (
    <motion.div
      key={`dashboard-${role}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header: Role switcher + branding ─────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nexora AI Treasury</h1>
          <p className="text-sm text-muted-foreground">
            Autonomous payroll &amp; cashflow agent · Somnia Testnet
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher role={role} onRoleChange={setRole} />
          <Button asChild size="sm">
            <Link href="/create">
              <Plus className="h-4 w-4 mr-1" />
              New Stream
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* ── Treasury Overview Stats ───────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <TreasuryOverview
          prediction={prediction}
          agentOutput={agentOutput}
          activeStreamCount={activeStreamIds?.length ?? 0}
          role={role}
          isLoading={cashflowLoading || agentLoading}
        />
      </motion.div>

      {/* ── Main Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left / centre column (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <RunwayChart prediction={prediction} isLoading={cashflowLoading} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <LiveStreamFlow />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StreamTable streamIds={streamIds} role={role} />
          </motion.div>
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <AIRecommendationsPanel
              recommendations={agentOutput?.recommendations ?? []}
              isLoading={agentLoading}
              healthScore={agentOutput?.healthScore}
              summary={agentOutput?.summary}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-somnia-500" />
                  Protocol Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Total Streams', value: stats?.totalStreams ?? 0, icon: Users },
                  { label: 'Active Streams', value: stats?.activeStreams ?? 0, icon: TrendingUp },
                  {
                    label: 'Total Volume',
                    value: stats?.totalVolume ? `${formatToken(stats.totalVolume, STT_DECIMALS, 2)} STT` : '0 STT',
                    icon: BarChart3,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <span className="font-semibold text-foreground">{String(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                {[
                  { href: '/create', icon: Plus, label: 'Create Stream' },
                  { href: '/templates', icon: BarChart3, label: 'Templates' },
                  { href: '/analytics', icon: TrendingUp, label: 'Analytics' },
                  { href: '/analytics/risk', icon: Shield, label: 'Risk Dashboard' },
                ].map(({ href, icon: Icon, label }) => (
                  <Button key={href} asChild variant="outline" size="sm" className="justify-start gap-2">
                    <Link href={href}>
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────── */}
      {recentEvents && recentEvents.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest stream events in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentEvents.slice(0, 5).map((event, index) => (
                  <div
                    key={`${event.transactionHash}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full animate-pulse ${
                          event.type === 'StreamCreated'
                            ? 'bg-emerald-500'
                            : event.type === 'Withdrawn'
                            ? 'bg-sky-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {event.type === 'StreamCreated'
                            ? 'Stream Created'
                            : event.type === 'Withdrawn'
                            ? 'Funds Withdrawn'
                            : 'Stream Cancelled'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stream #{event.args?.streamId?.toString() ?? '—'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Classic Stream Cards (detailed view) ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="h-5 w-5 text-amber-500" />
                Outgoing Streams
                <Badge variant="outline">{sentStreams?.length ?? 0}</Badge>
              </CardTitle>
              <CardDescription>Streams you&apos;re paying out</CardDescription>
            </CardHeader>
            <CardContent>
              {sentStreams && sentStreams.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sentStreams
                    .slice()
                    .reverse()
                    .map(id => (
                      <StreamCard key={id} streamId={id} isReceived={false} />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                  <ArrowUpRight className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No outgoing streams yet</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/create">Create first stream</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                Incoming Streams
                <Badge variant="outline">{receivedStreams?.length ?? 0}</Badge>
              </CardTitle>
              <CardDescription>Payments streaming to you</CardDescription>
            </CardHeader>
            <CardContent>
              {receivedStreams && receivedStreams.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {receivedStreams
                    .slice()
                    .reverse()
                    .map(id => (
                      <StreamCard key={id} streamId={id} isReceived={true} />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                  <ArrowDownLeft className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No incoming streams yet</p>
                  <p className="text-xs mt-1">Share your address to receive streams</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
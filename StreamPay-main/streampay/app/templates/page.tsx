'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWalletTemplates, DerivedTemplate } from '@/hooks/useTemplates';

import { formatToken, formatDuration, getStreamTypeIcon } from '@/lib/utils';
import { STREAM_TYPES, STT_DECIMALS } from '@/lib/contracts';
import {
  Search,
  Filter,
  Star,
  Users,
  Clock,
  DollarSign,
  Zap,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useAccount } from 'wagmi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Single template card — all data sourced from real on-chain streams
// ---------------------------------------------------------------------------
function DerivedTemplateCard({ template }: { template: DerivedTemplate }) {
  const router = useRouter();
  const { address } = useAccount();

  const durationLabel = formatDuration(template.duration);
  // flow rate: wei/second -> ETH/hour
  const ethPerHour = (Number(template.rate) * 3600) / 1e18;

  const typeKey = template.type.toLowerCase();
  const icon = getStreamTypeIcon(typeKey);

  const handleUseTemplate = () => {
    const params = new URLSearchParams({
      type: typeKey,
      rate: template.rate.toString(),
      duration: String(template.duration),
      description: template.title,
    });
    router.push(`/create?${params.toString()}`);
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-somnia-500/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{icon}</span>
              <div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <CardDescription className="mt-1">
                  Derived from your on-chain streams
                </CardDescription>
              </div>
            </div>
            <Badge variant={typeKey as any} className="capitalize">
              {typeKey}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{ethPerHour.toFixed(6)} ETH/hr</p>
                <p className="text-xs text-muted-foreground">Flow rate</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{template.timesUsed}</p>
                <p className="text-xs text-muted-foreground">Times used</p>
              </div>
            </div>
          </div>

          <div className="text-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Duration</span>
            </div>
            <p className="text-muted-foreground">{durationLabel}</p>
          </div>

          <div className="text-sm">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Total amount</span>
            </div>
            <p className="text-muted-foreground">
              {formatToken(template.totalAmount, STT_DECIMALS, 8)} STT
            </p>
          </div>

          <Button
            onClick={handleUseTemplate}
            disabled={!address}
            variant="somnia"
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function TemplatesPage() {
  const { address } = useAccount();
  const { templates, stats, totalSentStreams, isLoading } = useWalletTemplates(
    address as `0x${string}` | undefined,
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredTemplates = templates.filter((t) => {
    const matchesType =
      selectedType === 'all' || t.type.toLowerCase() === selectedType;
    const matchesSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-somnia-500 to-somnia-700 bg-clip-text text-transparent">
          Stream Templates
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Smart templates auto-generated from your real on-chain stream history.
          No mock data — every card reflects an actual pattern you have created.
        </p>
      </motion.div>

      {/* Live stats */}
      {address && (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Templates</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '' : stats.total}
              </div>
              <p className="text-xs text-muted-foreground">Distinct stream patterns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streams Created</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? '' : totalSentStreams}
              </div>
              <p className="text-xs text-muted-foreground">Sent from your wallet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Work Streams</CardTitle>
              <span className="text-lg"></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '' : stats.work}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gaming Streams</CardTitle>
              <span className="text-lg"></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '' : stats.gaming}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Templates</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by description or type"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Stream Type</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={selectedType === 'all' ? 'somnia' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType('all')}
                  >
                    All
                  </Button>
                  {Object.entries(STREAM_TYPES).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={selectedType === key ? 'somnia' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType(key)}
                      className="flex items-center space-x-1"
                    >
                      <span>{config.icon}</span>
                      <span className="hidden sm:inline">{config.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Templates grid */}
      {!address ? (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="text-center py-16">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Connect your wallet</h3>
              <p className="text-muted-foreground">
                Templates are derived from streams you have created on-chain.
                Connect your wallet to see them.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length > 0 ? (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTemplates.map((t, idx) => (
            <DerivedTemplateCard
              key={`${t.type}-${t.rate}-${t.duration}-${idx}`}
              template={t}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="text-center py-16">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {totalSentStreams === 0
                  ? 'No templates yet'
                  : 'No templates match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {totalSentStreams === 0
                  ? 'Create your first stream to generate smart templates.'
                  : 'Try adjusting your search or type filter.'}
              </p>
              {totalSentStreams === 0 && (
                <Button
                  variant="somnia"
                  onClick={() => window.location.assign('/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Stream
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

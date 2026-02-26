import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESSES, RATE_HELPERS } from '@/lib/contracts';
import { STREAM_FACTORY_ABI } from '@/lib/abis/StreamFactory';
import { STREAM_PAY_ABI } from '@/lib/abis/StreamPay';
import { parseEther } from 'viem';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useUserStreams } from '@/hooks/useStreamContract';

export type Template = {
  name: string;
  streamType: string;
  suggestedRate: bigint;
  minDuration: bigint;
  maxDuration: bigint;
  description: string;
  isActive: boolean;
  creator: string;
  usageCount: bigint;
};

export function useTemplate(templateId: number | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_FACTORY,
    abi: STREAM_FACTORY_ABI,
    functionName: 'getTemplate',
    args: templateId !== undefined ? [BigInt(templateId)] : undefined,
    query: {
      enabled: templateId !== undefined,
    },
  });

  return {
    template: data ? {
      name: data[0],
      streamType: data[1],
      suggestedRate: data[2],
      minDuration: data[3],
      maxDuration: data[4],
      description: data[5],
      isActive: data[6],
      creator: data[7],
      usageCount: data[8],
    } as Template : undefined,
    isLoading,
    error,
  };
}

export function useTemplatesByType(streamType: string) {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_FACTORY,
    abi: STREAM_FACTORY_ABI,
    functionName: 'getTemplatesByType',
    args: [streamType],
    query: {
      refetchInterval: 30000,
    },
  });

  return {
    templateIds: data ? data.map(id => Number(id)) : [],
    isLoading,
  };
}

export function useActiveTemplates() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_FACTORY,
    abi: STREAM_FACTORY_ABI,
    functionName: 'getActiveTemplateIds',
    query: {
      refetchInterval: 30000,
    },
  });

  return {
    activeTemplateIds: data ? data.map(id => Number(id)) : [],
    isLoading,
  };
}

export function useFactoryStats() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_FACTORY,
    abi: STREAM_FACTORY_ABI,
    functionName: 'getFactoryStats',
    query: {
      refetchInterval: 30000,
    },
  });

  return {
    stats: data ? {
      templatesCreated: Number(data[0]),
      streamsFromTemplates: Number(data[1]),
      totalPresets: Number(data[2]),
      workStreams: Number(data[3]),
      subscriptionStreams: Number(data[4]),
      gamingStreams: Number(data[5]),
    } : undefined,
    isLoading,
  };
}

// FIXED: Simplified createTemplate with USD rate conversion
export function useCreateTemplate() {
  const { writeContract, isPending, error } = useWriteContract();

  const createTemplate = async (
    name: string,
    streamType: string,
    hourlyRateUsd: number,        // USD per hour (e.g., 25)
    minDurationHours: number,     // Hours (e.g., 1)
    maxDurationHours: number,     // Hours (e.g., 40)
    description: string
  ) => {
    try {
      // Convert USD rate to wei per second
      const rateWeiPerSecond = RATE_HELPERS.usdHourToWeiSecond(hourlyRateUsd);
      const minDurationSeconds = BigInt(minDurationHours * 3600);
      const maxDurationSeconds = BigInt(maxDurationHours * 3600);

      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.STREAM_FACTORY,
        abi: STREAM_FACTORY_ABI,
        functionName: 'createTemplate',
        args: [
          name, 
          streamType, 
          rateWeiPerSecond, 
          minDurationSeconds, 
          maxDurationSeconds, 
          description
        ],
        value: parseEther("0.001"), // Small creation fee
      });
      
      toast.success('Template created successfully!');
      return hash;
    } catch (err) {
      console.error('Create template error:', err);
      toast.error('Failed to create template');
      throw err;
    }
  };

  return {
    createTemplate,
    isPending,
    error,
  };
}

export function useCreateStreamFromTemplate() {
  const { writeContract, isPending, error } = useWriteContract();

  const createStreamFromTemplate = async (
    templateId: number,
    recipient: `0x${string}`,
    durationHours: number,        // FIXED: Accept hours, convert internally
    customRateUsd?: number        // FIXED: Optional USD rate
  ) => {
    try {
      const durationSeconds = Math.floor(durationHours * 3600);
      
      // If custom rate provided, use it; otherwise use 0n (template default)
      const customRateWei = customRateUsd 
        ? RATE_HELPERS.usdHourToWeiSecond(customRateUsd)
        : 0n;

      // Calculate payment amount (template will handle rate calculation)
      const estimatedRate = customRateWei || parseEther("0.01"); // Fallback estimate
      const totalPayment = BigInt(durationSeconds) * estimatedRate;

      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.STREAM_FACTORY,
        abi: STREAM_FACTORY_ABI,
        functionName: 'createStreamFromTemplate',
        args: [BigInt(templateId), recipient, BigInt(durationSeconds), customRateWei],
        value: totalPayment,
      });
      
      toast.success('Stream created from template!');
      return hash;
    } catch (err) {
      console.error('Create stream from template error:', err);
      toast.error('Failed to create stream from template');
      throw err;
    }
  };

  return {
    createStreamFromTemplate,
    isPending,
    error,
  };
}

// ---------------------------------------------------------------------------
// Real on-chain wallet templates — derived from the connected wallet's own
// sent streams. No mock data, no factory presets.
// ---------------------------------------------------------------------------

export type DerivedTemplate = {
  /** Human-readable label – from stream description or generated */
  title: string;
  /** Stream type key, e.g. "work" | "subscription" | "gaming" | "other" */
  type: string;
  /** Flow rate in wei/second from the contract */
  rate: bigint;
  /** Stream duration in seconds */
  duration: number;
  /** Total amount escrowed for the stream (wei) */
  totalAmount: bigint;
  /** How many streams by this wallet match this pattern */
  timesUsed: number;
};

/**
 * Fetches every stream ever sent by `address`, batches the on-chain reads,
 * then groups similar streams into reusable "template" objects.
 *
 * Similarity is keyed on: streamType + flowRate + duration (rounded to the
 * nearest hour to tolerate small creation-time drift).
 */
export function useWalletTemplates(address: `0x${string}` | undefined) {
  const { sentStreams } = useUserStreams(address);

  // Build a wagmi multi-call list for every sent stream id
  const contracts = useMemo(
    () =>
      sentStreams.map((id) => ({
        address: CONTRACT_ADDRESSES.STREAM_PAY as `0x${string}`,
        abi: STREAM_PAY_ABI,
        functionName: 'getStreamInfo' as const,
        args: [BigInt(id)] as [bigint],
      })),
    // Stringify to avoid false re-renders when wagmi returns a new array ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sentStreams.join(',')],
  );

  const { data: streamsData, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 10000,
    },
  });

  const { templates, stats } = useMemo(() => {
    if (!streamsData || streamsData.length === 0) {
      return {
        templates: [] as DerivedTemplate[],
        stats: { total: 0, work: 0, subscription: 0, gaming: 0, other: 0 },
      };
    }

    type RawStream = {
      streamType: string;
      flowRate: bigint;
      startTime: bigint;
      stopTime: bigint;
      totalAmount: bigint;
      description: string;
    };

    const parsed: RawStream[] = [];

    streamsData.forEach((result) => {
      if (result.status !== 'success' || !result.result) return;
      const d = result.result as readonly unknown[];
      parsed.push({
        streamType: (d[8] as string) || 'other',
        flowRate: d[3] as bigint,
        startTime: d[4] as bigint,
        stopTime: d[5] as bigint,
        totalAmount: d[2] as bigint,
        description: (d[9] as string) || '',
      });
    });

    // Group by pattern key
    const groups = new Map<
      string,
      { count: number; sample: RawStream }
    >();

    parsed.forEach((s) => {
      const rawDuration = Number(s.stopTime - s.startTime);
      // Round to nearest hour so minor timing jitter doesn't create duplicates
      const durationRounded = Math.round(rawDuration / 3600) * 3600;
      const key = `${s.streamType.toLowerCase()}|${s.flowRate.toString()}|${durationRounded}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, { count: 1, sample: { ...s, stopTime: s.startTime + BigInt(durationRounded) } });
      }
    });

    const templates: DerivedTemplate[] = Array.from(groups.values()).map(
      ({ count, sample }) => {
        const duration = Number(sample.stopTime - sample.startTime);
        const typeKey = sample.streamType.toLowerCase() || 'other';
        const title =
          sample.description.trim() ||
          `${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)} Stream`;
        return {
          title,
          type: typeKey,
          rate: sample.flowRate,
          duration,
          totalAmount: sample.totalAmount,
          timesUsed: count,
        };
      },
    );

    // Sort most-used first
    templates.sort((a, b) => b.timesUsed - a.timesUsed);

    const statsObj = {
      total: templates.length,
      work: parsed.filter((s) => s.streamType.toLowerCase() === 'work').length,
      subscription: parsed.filter((s) => s.streamType.toLowerCase() === 'subscription').length,
      gaming: parsed.filter((s) => s.streamType.toLowerCase() === 'gaming').length,
      other: parsed.filter(
        (s) =>
          !['work', 'subscription', 'gaming'].includes(s.streamType.toLowerCase()),
      ).length,
    };

    return { templates, stats: statsObj };
  }, [streamsData]);

  return {
    templates,
    stats,
    totalSentStreams: sentStreams.length,
    isLoading,
  };
}

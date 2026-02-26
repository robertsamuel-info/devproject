import { useReadContract, useReadContracts, useWriteContract, useWatchContractEvent } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { STREAM_PAY_ABI } from '@/lib/abis/StreamPay';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';

/**
 * JSON.stringify replacement that safely handles BigInt values returned by
 * wagmi / viem contract reads. Native JSON.stringify throws
 * "TypeError: Do not know how to serialize a BigInt" otherwise.
 */
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
}

export type StreamInfo = {
  sender: string;
  recipient: string;
  totalAmount: bigint;
  flowRate: bigint;
  startTime: bigint;
  stopTime: bigint;
  currentBalance: bigint;
  isActive: boolean;
  streamType: string;
  description: string;
};

export function useStreamInfo(streamId: number | undefined) {
  const { data, isError, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    functionName: 'getStreamInfo',
    args: streamId !== undefined ? [BigInt(streamId)] : undefined,
    query: {
      enabled: streamId !== undefined,
      refetchInterval: 10000, // was 2000 — 2s polling per stream row caused excessive cascading re-renders
    },
  });

  // Memoize the mapped streamInfo object so its reference is stable between
  // renders. Without this, every render produces a new object, causing any
  // useEffect([streamInfo]) in consumers (e.g. StreamRiskRow) to fire
  // continuously — the classic "new object in deps" re-render loop.
  const streamInfo = useMemo<StreamInfo | undefined>(
    () =>
      data
        ? {
            sender: data[0],
            recipient: data[1],
            totalAmount: data[2],
            flowRate: data[3],
            startTime: data[4],
            stopTime: data[5],
            currentBalance: data[6],
            isActive: data[7],
            streamType: data[8],
            description: data[9],
          }
        : undefined,
    // Use the individual fields rather than `data` so we avoid false positives
    // when wagmi returns a structurally-identical but reference-different tuple.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data?.[0], data?.[1], data?.[2], data?.[3], data?.[4],
      data?.[5], data?.[6], data?.[7], data?.[8], data?.[9],
    ],
  );

  return {
    streamInfo,
    isLoading,
    isError,
    refetch,
  };
}

export function useUserStreams(userAddress: `0x${string}` | undefined) { // FIXED: Proper address type
  const { data: sentStreams } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    functionName: 'getUserStreams',
    args: userAddress ? [userAddress] : undefined, // This will now be properly typed
    query: {
      enabled: !!userAddress,
      refetchInterval: 5000,
    },
  });

  const { data: receivedStreams } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    functionName: 'getRecipientStreams',
    args: userAddress ? [userAddress] : undefined, // This will now be properly typed
    query: {
      enabled: !!userAddress,
      refetchInterval: 5000,
    },
  });

  // Stabilise array references so downstream useCallback/useEffect deps
  // don't change identity on every render — root cause of the re-render loop.
  const mappedSentStreams = useMemo(
    () => (sentStreams ? sentStreams.map(id => Number(id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeStringify(sentStreams)],
  );
  const mappedReceivedStreams = useMemo(
    () => (receivedStreams ? receivedStreams.map(id => Number(id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeStringify(receivedStreams)],
  );

  return {
    sentStreams: mappedSentStreams,
    receivedStreams: mappedReceivedStreams,
  };
}

export function useProtocolStats() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    functionName: 'getProtocolStats',
    query: {
      refetchInterval: 10000, // Update every 10 seconds
    },
  });

  // Memoize to avoid a new object reference on every render, which would
  // invalidate any useCallback that lists `stats` as a dependency.
  const stats = useMemo(
    () =>
      data
        ? {
            totalStreams: Number(data[0]),
            totalUpdates: Number(data[1]),
            totalVolume: data[2],
            activeStreams: Number(data[3]),
            lastUpdate: Number(data[4]),
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.[0], data?.[1], String(data?.[2]), data?.[3], data?.[4]],
  );

  return { stats, isLoading };
}

export function useActiveStreams() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    functionName: 'getActiveStreamIds',
    query: {
      refetchInterval: 5000,
    },
  });

  // Stabilise array reference — prevents useCallback/useEffect from firing
  // on every render when content hasn't actually changed.
  const activeStreamIds = useMemo(
    () => (data ? data.map(id => Number(id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeStringify(data)],
  );

  return {
    activeStreamIds,
    isLoading,
  };
}

export function useCreateStream() {
  const { writeContract, isPending, error } = useWriteContract();

  const createStream = async (
    recipient: `0x${string}`,
    duration: number,
    streamType: string,
    description: string,
    amount: bigint
  ) => {
    try {
      console.log('Creating stream with params:', {
        recipient,
        duration,
        streamType,
        description,
        amount: amount.toString(),
        contractAddress: CONTRACT_ADDRESSES.STREAM_PAY
      });

      // Validate inputs
      if (!CONTRACT_ADDRESSES.STREAM_PAY) {
        throw new Error('Contract address not configured');
      }
      
      if (amount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }
      
      if (duration <= 0) {
        throw new Error('Duration must be greater than 0');
      }

      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.STREAM_PAY,
        abi: STREAM_PAY_ABI,
        functionName: 'createStream',
        args: [recipient, BigInt(duration), streamType, description],
        value: amount,
      });
      
      toast.success('Stream created successfully!');
      return hash;
    } catch (err: any) {
      console.error('Create stream error:', err);
      
      // Better error messages
      if (err?.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds to create stream');
      } else if (err?.message?.includes('user rejected')) {
        toast.error('Transaction cancelled by user');
      } else if (err?.message?.includes('gas')) {
        toast.error('Transaction failed - check gas settings');
      } else {
        toast.error(`Failed to create stream: ${err?.message || 'Unknown error'}`);
      }
      throw err;
    }
  };

  return {
    createStream,
    isPending,
    error,
  };
}

export function useCreateGroupStream() {
  const { writeContract, isPending, error } = useWriteContract();

  const createGroupStream = async (
    recipients: `0x${string}`[],
    duration: number,
    streamType: string,
    description: string,
    totalAmount: bigint,
  ) => {
    try {
      if (!CONTRACT_ADDRESSES.STREAM_PAY) throw new Error('Contract address not configured');
      if (recipients.length === 0) throw new Error('No recipients provided');
      if (totalAmount <= 0n) throw new Error('Amount must be greater than 0');
      if (duration <= 0) throw new Error('Duration must be greater than 0');
      if (totalAmount % BigInt(recipients.length) !== 0n)
        throw new Error('Total amount is not evenly divisible by recipient count');

      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.STREAM_PAY,
        abi: STREAM_PAY_ABI,
        functionName: 'createGroupStream',
        args: [recipients, BigInt(duration), streamType, description],
        value: totalAmount,
      });

      toast.success(`Group stream created for ${recipients.length} recipients!`);
      return hash;
    } catch (err: any) {
      console.error('Create group stream error:', err);
      if (err?.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds to create group stream');
      } else if (err?.message?.includes('user rejected')) {
        toast.error('Transaction cancelled by user');
      } else if (err?.message?.includes('not evenly divisible')) {
        toast.error('Amount must be evenly divisible by number of recipients');
      } else {
        toast.error(`Failed to create group stream: ${err?.message || 'Unknown error'}`);
      }
      throw err;
    }
  };

  return { createGroupStream, isPending, error };
}


export function useWithdrawFromStream() {
  const { writeContract, isPending, error } = useWriteContract();

  const withdrawFromStream = async (streamId: number) => {
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.STREAM_PAY,
        abi: STREAM_PAY_ABI,
        functionName: 'withdrawFromStream',
        args: [BigInt(streamId)],
      });
      
      toast.success('Withdrawal successful!');
      return hash;
    } catch (err) {
      toast.error('Failed to withdraw from stream');
      throw err;
    }
  };

  return {
    withdrawFromStream,
    isPending,
    error,
  };
}

export function useCancelStream() {
  const { writeContract, isPending, error } = useWriteContract();

  const cancelStream = async (streamId: number) => {
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.STREAM_PAY,
        abi: STREAM_PAY_ABI,
        functionName: 'cancelStream',
        args: [BigInt(streamId)],
      });
      
      toast.success('Stream cancelled successfully!');
      return hash;
    } catch (err) {
      toast.error('Failed to cancel stream');
      throw err;
    }
  };

  return {
    cancelStream,
    isPending,
    error,
  };
}

// Hook for listening to real-time stream events
export function useStreamEvents() {
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    eventName: 'StreamCreated',
    onLogs(logs) {
      logs.forEach(log => {
        setRecentEvents(prev => [
          { type: 'StreamCreated', ...log, timestamp: Date.now() },
          ...prev.slice(0, 9) // Keep only last 10 events
        ]);
        toast.success(`New stream created: #${log.args.streamId}`);
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    eventName: 'Withdrawn',
    onLogs(logs) {
      logs.forEach(log => {
        setRecentEvents(prev => [
          { type: 'Withdrawn', ...log, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    eventName: 'StreamCancelled',
    onLogs(logs) {
      logs.forEach(log => {
        setRecentEvents(prev => [
          { type: 'StreamCancelled', ...log, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      });
    },
  });

  return { recentEvents };
}

// Hook to count real on-chain stream types for analytics chart
export function useStreamTypeCounts(streamIds: number[]) {
  const contracts = useMemo(
    () =>
      streamIds.map((id) => ({
        address: CONTRACT_ADDRESSES.STREAM_PAY as `0x${string}`,
        abi: STREAM_PAY_ABI,
        functionName: 'getStreamInfo' as const,
        args: [BigInt(id)] as const,
      })),
    // Stable dep: only recompute when stringified IDs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeStringify(streamIds)],
  );

  const { data, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: streamIds.length > 0,
      refetchInterval: 10000,
    },
  });

  const counts = useMemo(() => {
    const result = { work: 0, subscription: 0, gaming: 0 };
    if (!data) return result;
    for (const item of data) {
      if (item.status !== 'success' || !item.result) continue;
      // ABI index 8 is streamType (string)
      const raw = (item.result as readonly unknown[])[8];
      const key = String(raw ?? '').toLowerCase().trim();
      if (key === 'work') result.work++;
      else if (key === 'subscription') result.subscription++;
      else if (key === 'gaming') result.gaming++;
    }
    return result;
  }, [data]);

  const total = counts.work + counts.subscription + counts.gaming;

  const chartData = useMemo(() => {
    if (total === 0) return [];
    return [
      { name: 'Work', value: counts.work, color: '#10b981' },
      { name: 'Subscription', value: counts.subscription, color: '#8b5cf6' },
      { name: 'Gaming', value: counts.gaming, color: '#f59e0b' },
    ].filter((d) => d.value > 0);
  }, [counts, total]);

  return { chartData, counts, total, isLoading };
}

// Hook for real-time balance updates
export function useRealTimeBalance(streamId: number | undefined) {
  const { data: contractBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.STREAM_PAY,
    abi: STREAM_PAY_ABI,
    functionName: 'getCurrentBalance',
    args: streamId !== undefined ? [BigInt(streamId)] : undefined,
    query: {
      enabled: streamId !== undefined,
      refetchInterval: 5000, // was 1000 — polling every second caused excessive re-renders
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  });

  return {
    balance: contractBalance || 0n,
    refetchBalance,
  };
}

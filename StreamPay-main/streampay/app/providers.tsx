'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { somniaTestnet } from '@/lib/contracts';

// MetaMask-only config — no WalletConnect, no WebSocket transport.
// WalletConnect caused "Connection interrupted while trying to subscribe"
// errors because the injected provider doesn't support WC's WebSocket relay.
const config = createConfig({
  chains: [somniaTestnet],
  connectors: [injected()],
  transports: {
    [somniaTestnet.id]: http('https://dream-rpc.somnia.network'),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 30000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#0ea5e9',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          appInfo={{
            appName: 'StreamPay',
            learnMoreUrl: 'https://somnia.network',
          }}
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

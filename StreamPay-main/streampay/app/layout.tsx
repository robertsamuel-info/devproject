import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import Header from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nexora AI Treasury – Autonomous Payroll & Cashflow Agent',
  description: 'AI-powered crypto payroll streaming with cashflow prediction, fraud detection, and treasury automation on Somnia blockchain',
  keywords: 'blockchain, streaming, payroll, AI, treasury, somnia, defi, cashflow, fraud detection',
  authors: [{ name: 'Nexora AI Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7c3aed',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

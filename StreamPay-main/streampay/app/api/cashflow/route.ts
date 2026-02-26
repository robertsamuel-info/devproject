import { NextRequest, NextResponse } from 'next/server';
import { predictCashflow } from '@/lib/ai/cashflow-predictor';
import type { StreamEventData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const currentBalance: number = Number(body.currentBalance);
    if (isNaN(currentBalance) || currentBalance < 0) {
      return NextResponse.json(
        { error: 'currentBalance must be a non-negative number (STT units)' },
        { status: 400 },
      );
    }

    const historicalEvents: StreamEventData[] = Array.isArray(body.historicalEvents)
      ? body.historicalEvents
      : [];

    const horizonDays: number =
      typeof body.horizonDays === 'number' && body.horizonDays > 0
        ? Math.min(body.horizonDays, 365)
        : 90;

    const prediction = await predictCashflow(currentBalance, historicalEvents, horizonDays);
    return NextResponse.json(prediction);
  } catch (error) {
    console.error('[/api/cashflow] Error:', error);
    return NextResponse.json({ error: 'Cashflow prediction failed' }, { status: 500 });
  }
}

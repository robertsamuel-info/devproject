import { NextRequest, NextResponse } from 'next/server';
import { runTreasuryAgent } from '@/lib/ai/treasury-agent';
import type { TreasuryState } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.activeStreams)) {
      return NextResponse.json(
        { error: 'activeStreams must be an array' },
        { status: 400 },
      );
    }

    const state: TreasuryState = {
      treasuryBalance: Number(body.treasuryBalance) || 0,
      activeStreams: body.activeStreams,
      runwayDays: Number(body.runwayDays) || 999,
      keeperReward: Number(body.keeperReward) || 0.001,
      estimatedGasCost: Number(body.estimatedGasCost) || 0.0005,
      totalMonthlyOutflow: Number(body.totalMonthlyOutflow) || 0,
    };

    const output = await runTreasuryAgent(state);
    return NextResponse.json(output);
  } catch (error) {
    console.error('[/api/treasury] Error:', error);
    return NextResponse.json({ error: 'Treasury agent failed' }, { status: 500 });
  }
}

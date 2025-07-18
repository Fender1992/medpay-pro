import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const healthData = await dbService.getHealthData(userId);
    
    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Health API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    );
  }
}
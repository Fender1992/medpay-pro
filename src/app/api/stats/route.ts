import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const stats = await dbService.getPlatformStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform stats' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { ChatRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await aiService.generateResponse(body);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { dbService } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { formType, templateType, user } = await request.json();
    
    const aiService = new AIService();
    let prompt = '';
    
    if (templateType === 'tax' && user.role === 'admin') {
      // Get platform stats for tax form
      const stats = await dbService.getPlatformStats();
      prompt = `Generate a comprehensive tax summary form for MedChat AI Pro healthcare platform. Include:
      
      Company Information:
      - Company Name: MedChat AI Pro
      - Industry: Healthcare Technology
      - User Base: ${stats.totalUsers} users
      - Annual Revenue: Estimate based on ${stats.totalUsers} users
      - Platform Activity: ${stats.totalChats} conversations, ${stats.totalDocuments} documents processed
      
      Include sections for:
      1. Business Revenue and Expenses
      2. Technology Infrastructure Costs
      3. User Subscription Revenue
      4. Healthcare Compliance Costs
      5. AI Services Expenses (Claude AI, OpenAI)
      6. Database and Storage Costs
      7. Employee and Contractor Payments
      8. Marketing and Growth Expenses
      9. Deductions and Credits
      10. Year-over-Year Growth Analysis
      
      Format as a professional tax document with clear sections and calculations.`;
    } else if (templateType === 'administrative' && user.role === 'admin') {
      const stats = await dbService.getPlatformStats();
      prompt = `Generate a comprehensive analytics report for MedChat AI Pro healthcare platform. Include:
      
      Executive Summary:
      - Platform Overview
      - Current Performance: ${stats.totalUsers} users, ${stats.totalChats} conversations
      - Growth Metrics: ${stats.userGrowth}% user growth, ${stats.chatGrowth}% chat growth
      
      Detailed Metrics:
      1. User Analytics
      2. Platform Usage Statistics
      3. AI Performance Metrics
      4. Document Processing Analytics
      5. System Performance
      6. Revenue Analysis
      7. Compliance Status
      8. Security Metrics
      9. Future Projections
      10. Recommendations
      
      Format as a professional business report with charts and data visualization suggestions.`;
    } else {
      // User-specific form generation
      const healthData = await dbService.getHealthData(user.id);
      
      prompt = `Generate a personalized ${formType} for ${user.name} based on their profile:
      
      User Information:
      - Name: ${user.name}
      - Email: ${user.email}
      - Role: ${user.role}
      - Facility: ${user.facility || 'N/A'}
      - Department: ${user.department || 'N/A'}
      
      Health Data:
      - Medications: ${healthData.medications?.length || 0} active medications
      - Recent Lab Results: ${healthData.lab_results?.length || 0} results
      - Upcoming Appointments: ${healthData.appointments?.length || 0} scheduled
      - Vital Signs: ${healthData.vital_signs?.length || 0} recorded
      
      Create a comprehensive form that includes:
      1. Pre-filled user information
      2. Relevant medical history sections
      3. Current medications and conditions
      4. Emergency contact information
      5. Insurance information
      6. Provider preferences
      7. Consent and authorization sections
      8. Signature fields
      
      Format as a professional medical form with clear sections and fields.`;
    }
    
    const response = await aiService.generateResponse({
      message: prompt,
      user_id: user.id,
      user_role: user.role
    });
    
    return NextResponse.json({ content: response.response });
    
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
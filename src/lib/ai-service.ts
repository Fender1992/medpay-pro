import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ChatRequest, ChatResponse, APIStatus, Document, HealthRecord } from '@/types';
import { ragService } from './rag-service';
import { langChainService } from './langchain-service';

export class AIService {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private claudeAvailable = false;
  private openaiAvailable = false;
  private medicalKnowledge: string;

  constructor() {
    this.initializeClients();
    this.medicalKnowledge = this.loadMedicalKnowledge();
  }

  private initializeClients() {
    // Initialize Claude (Anthropic)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey !== 'your-anthropic-api-key') {
      try {
        this.anthropic = new Anthropic({ apiKey: anthropicKey });
        this.claudeAvailable = true;
        console.log('✅ Claude AI initialized');
      } catch (error) {
        console.error('❌ Claude initialization failed:', error);
      }
    } else {
      console.log('⚠️  Claude AI: No API key configured, using mock responses');
    }

    // Initialize OpenAI with browser safety option
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'your-openai-api-key') {
      try {
        this.openai = new OpenAI({ 
          apiKey: openaiKey,
          dangerouslyAllowBrowser: true // Only for development/demo purposes
        });
        this.openaiAvailable = true;
        console.log('✅ OpenAI initialized');
      } catch (error) {
        console.error('❌ OpenAI initialization failed:', error);
      }
    } else {
      console.log('⚠️  OpenAI: No API key configured, using mock embeddings');
    }
  }

  private loadMedicalKnowledge(): string {
    return `
# Medical Knowledge Base

## Core Medical Principles
- Evidence-based medicine and clinical guidelines
- Patient safety and HIPAA compliance
- Drug interaction analysis and contraindications
- Clinical decision support systems
- Healthcare quality metrics and outcomes

## Healthcare Data Types
- Electronic Health Records (EHR)
- Laboratory results and interpretations
- Medication administration records
- Vital signs monitoring
- Diagnostic imaging reports
- Clinical notes and assessments

## Common Medical Conditions
- Diabetes management and blood glucose monitoring
- Hypertension and cardiovascular health
- Medication adherence and side effects
- Preventive care and screening guidelines
- Chronic disease management protocols

## Healthcare Workflows
- Patient intake and registration
- Clinical documentation requirements
- Medication reconciliation processes
- Lab result review and follow-up
- Appointment scheduling and coordination
- Discharge planning and care transitions
`;
  }

  private getRoleSpecificPrompt(role: string): string {
    const basePrompt = `You are MedChat AI Pro, an advanced healthcare assistant with comprehensive medical knowledge.

Medical Knowledge Base:
${this.medicalKnowledge}

Core Responsibilities:
- Provide evidence-based healthcare information
- Analyze medical documents and lab results  
- Support clinical decision-making with current guidelines
- Maintain strict HIPAA compliance and patient privacy
- Offer medication information and interaction analysis

CRITICAL: You are an AI assistant, not a replacement for professional medical advice. Always encourage users to consult qualified healthcare providers for medical decisions.`;

    const rolePrompts = {
      admin: basePrompt + `
Role: Healthcare Administrator
Focus Areas:
- Platform analytics and operational metrics
- Revenue cycle management and billing optimization
- Quality improvement initiatives and outcomes
- Staff productivity and resource allocation
- Regulatory compliance and audit preparation
- Healthcare technology integration and workflows

Provide data-driven insights for healthcare facility management and strategic decision-making.`,

      provider: basePrompt + `
Role: Healthcare Provider (Physician/Nurse/Clinician)
Focus Areas:
- Clinical decision support and differential diagnosis
- Drug interaction analysis and dosing recommendations
- Lab result interpretation with clinical significance
- Patient assessment and care plan development
- Evidence-based treatment protocols and guidelines
- Care coordination and referral management

Provide clinical insights while emphasizing the need for professional judgment and patient-specific considerations.`,

      user: basePrompt + `
Role: Patient Healthcare Assistant
Focus Areas:
- Personal health record explanation and guidance
- Medication information and adherence support
- Lab result interpretation in patient-friendly language
- Appointment preparation and follow-up care
- Health education and wellness recommendations
- Symptom tracking and health monitoring

Provide clear, empathetic explanations while encouraging active participation in healthcare and professional consultation.`
    };

    return rolePrompts[role as keyof typeof rolePrompts] || rolePrompts.user;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiAvailable || !this.openai) {
      return this.generateMockEmbedding(text);
    }

    try {
      const response = await this.openai.embeddings.create({
        input: text,
        model: 'text-embedding-ada-002'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      return this.generateMockEmbedding(text);
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate consistent mock embedding based on text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const embedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      hash = ((hash * 9301) + 49297) % 233280;
      embedding.push((hash / 233280) * 2 - 1);
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  async extractDocumentContent(file: ArrayBuffer, fileType: string, filename: string): Promise<string> {
    try {
      if (fileType === 'text/plain') {
        return new TextDecoder().decode(file);
      }

      if (fileType === 'application/pdf') {
        // For now, return placeholder - would need pdf-parse in Node.js environment
        return `PDF Document: ${filename}\nContent extraction requires server-side processing.`;
      }

      if (fileType.startsWith('image/')) {
        // For now, return placeholder - would need Tesseract.js
        return `Image Document: ${filename}\nOCR text extraction requires server-side processing.`;
      }

      if (fileType === 'application/json') {
        const text = new TextDecoder().decode(file);
        return `JSON Document: ${filename}\n${text}`;
      }

      return `Document: ${filename}\nUnsupported file type: ${fileType}`;
    } catch (error) {
      console.error('Content extraction error:', error);
      return `Error extracting content from ${filename}: ${error}`;
    }
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    if (!this.claudeAvailable || !this.anthropic) {
      return this.generateFallbackResponse(request);
    }

    try {
      // Build enhanced message with context
      const contextParts = [request.message];

      // Create LangChain retrieval chain for enhanced context
      const retrievalChain = await langChainService.createRetrievalChain(
        request.message,
        request.user_id,
        request.health_data ? this.formatHealthContext(request.health_data) : undefined
      );
      
      if (retrievalChain.context) {
        contextParts.unshift(retrievalChain.context);
      }

      // Add health data context
      if (request.health_data && request.user_role === 'user') {
        const healthContext = this.formatHealthContext(request.health_data);
        if (healthContext) {
          contextParts.unshift(healthContext);
        }
      }

      // Add document context (for any additional documents)
      if (request.documents && request.documents.length > 0) {
        const docContext = this.formatDocumentContext(request.documents);
        if (docContext) {
          contextParts.splice(-1, 0, docContext);
        }
      }

      const enhancedMessage = contextParts.join('\n\n');

      // Generate response with Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        temperature: 0.1,
        system: this.getRoleSpecificPrompt(request.user_role),
        messages: [{ role: 'user', content: enhancedMessage }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : 'Error generating response';

      // Log retrieval interaction
      await langChainService.logInteraction('retrieval', {
        query: request.message,
        context_used: !!retrievalChain.context,
        sources_count: retrievalChain.sources.length,
        confidence: retrievalChain.confidence,
        response_length: responseText.length
      }, request.user_id);

      return {
        response: responseText,
        success: true,
        metadata: {
          sources: retrievalChain.sources,
          confidence: retrievalChain.confidence,
          context_used: !!retrievalChain.context
        }
      };
    } catch (error) {
      console.error('Claude response error:', error);
      return this.generateFallbackResponse(request);
    }
  }

  private formatHealthContext(healthData: HealthRecord): string {
    const contextParts: string[] = [];

    if (healthData.medications && healthData.medications.length > 0) {
      contextParts.push(`Current Medications (${healthData.medications.length}):`);
      healthData.medications.slice(0, 5).forEach(med => {
        contextParts.push(`- ${med.name} ${med.dosage} (${med.frequency})`);
      });
    }

    if (healthData.lab_results && healthData.lab_results.length > 0) {
      contextParts.push(`\nRecent Lab Results (${healthData.lab_results.length}):`);
      healthData.lab_results.slice(0, 3).forEach(lab => {
        contextParts.push(`- ${lab.test_name}: ${lab.value} (${lab.status})`);
      });
    }

    if (healthData.appointments && healthData.appointments.length > 0) {
      contextParts.push(`\nUpcoming Appointments (${healthData.appointments.length}):`);
      healthData.appointments.slice(0, 2).forEach(apt => {
        contextParts.push(`- ${apt.appointment_date} with ${apt.provider_name} (${apt.appointment_type})`);
      });
    }

    return contextParts.join('\n');
  }

  private formatDocumentContext(documents: Document[]): string {
    if (!documents.length) return '';

    const contextParts = [`Based on ${documents.length} uploaded document(s):`];

    documents.slice(0, 3).forEach((doc, index) => {
      contextParts.push(`\n📄 ${doc.filename}:`);
      if (doc.content) {
        const content = doc.content.length > 500 ? doc.content.substring(0, 500) + '...' : doc.content;
        contextParts.push(content);
      }
    });

    return contextParts.join('\n');
  }

  private generateFallbackResponse(request: ChatRequest): ChatResponse {
    const messageLower = request.message.toLowerCase();

    // Health-specific responses based on available data
    if (request.health_data && request.user_role === 'user') {
      if (messageLower.includes('medication')) {
        const meds = request.health_data.medications || [];
        if (meds.length > 0) {
          const medList = meds.slice(0, 3).map(m => `${m.name} ${m.dosage}`).join(', ');
          return {
            response: `💊 **Your Current Medications:** ${medList}. Please consult your healthcare provider about any medication questions or concerns.`,
            success: true
          };
        }
      }

      if (messageLower.includes('lab') || messageLower.includes('test')) {
        const labs = request.health_data.lab_results || [];
        if (labs.length > 0) {
          const recentLab = labs[0];
          return {
            response: `🔬 **Most Recent Lab Result:** ${recentLab.test_name}: ${recentLab.value} (${recentLab.status}). Your healthcare provider can provide detailed interpretation.`,
            success: true
          };
        }
      }

      if (messageLower.includes('appointment')) {
        const apts = request.health_data.appointments || [];
        if (apts.length > 0) {
          const nextApt = apts[0];
          return {
            response: `📅 **Next Appointment:** ${nextApt.appointment_date} with ${nextApt.provider_name} for ${nextApt.appointment_type}.`,
            success: true
          };
        }
      }
    }

    // Role-specific fallback responses
    const fallbackResponses = {
      admin: '📊 **Administrative Assistant:** I can help with platform analytics, user management, and operational insights. Note: Claude AI is not available - please configure the API key for full functionality.',
      provider: '👨‍⚕️ **Clinical Assistant:** I can support clinical decisions and patient care workflows. Note: Claude AI is not available - please configure the API key for enhanced clinical decision support.',
      user: '🏥 **Health Assistant:** I can help with your health records, medications, and appointments using available data. Note: Claude AI is not available - please configure the API key for comprehensive health guidance.'
    };

    return {
      response: fallbackResponses[request.user_role as keyof typeof fallbackResponses] || fallbackResponses.user,
      success: true
    };
  }

  /**
   * Process document for RAG system
   */
  async processDocumentForRAG(document: Document, content: string): Promise<void> {
    try {
      console.log(`🔍 Processing document for RAG: ${document.filename}`);
      
      // Extract text content based on file type
      const extractedText = ragService.extractTextFromContent(content, document.file_type);
      
      // Process document with RAG service
      await ragService.processDocument(document, extractedText);
      
      console.log(`✅ Document processed for RAG: ${document.filename}`);
    } catch (error) {
      console.error('Error processing document for RAG:', error);
    }
  }

  /**
   * Search documents using RAG
   */
  async searchDocuments(query: string, userId: string, limit: number = 5) {
    try {
      return await ragService.searchRelevantDocuments(query, userId, limit);
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  getAPIStatus(): APIStatus {
    const ragStatus = ragService.getSystemStatus();
    
    return {
      claude: {
        available: this.claudeAvailable,
        status: this.claudeAvailable ? '✅ Connected' : '⚠️ Configure API Key',
        model: this.claudeAvailable ? 'claude-3-sonnet-20240229' : undefined
      },
      openai: {
        available: this.openaiAvailable,
        status: this.openaiAvailable ? '✅ Connected' : '⚠️ Mock Mode',
        model: this.openaiAvailable ? 'text-embedding-3-small' : undefined
      },
      database: {
        available: true,
        status: '✅ Available',
        type: 'Integrated'
      }
    };
  }
}

export const aiService = new AIService();
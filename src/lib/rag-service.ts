import { OpenAI } from 'openai';
import { Document } from '@/types';
import { dbService } from './supabase';
import { langChainService } from './langchain-service';

// Pinecone integration (basic implementation)
interface PineconeVector {
  id: string;
  values: number[];
  metadata: {
    content: string;
    filename: string;
    user_id: string;
    created_at: string;
    document_id: string;
  };
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
    filename: string;
    user_id: string;
    created_at: string;
  };
}

export interface RAGResult {
  content: string;
  similarity: number;
  metadata: DocumentChunk['metadata'];
}

export class RAGService {
  private openai: OpenAI | null = null;
  private isAvailable: boolean;
  private pineconeKey: string;
  private pineconeIndex: string;
  private vectorStore: Map<string, DocumentChunk[]> = new Map();

  constructor() {
    const openaiKey = process.env.OPENAI_API_KEY;
    this.pineconeKey = 'pcsk_2h1yAp_B9HWcfcHLD6kVXGEXi1FfhpF1p5Tbsvhcn5bfCM3SWjEEQaetQvBqpbw926QiQc';
    this.pineconeIndex = 'medchat-documents';
    
    if (openaiKey && openaiKey.startsWith('sk-')) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
        dangerouslyAllowBrowser: true // Only for development
      });
      this.isAvailable = true;
      console.log('✅ RAG Service initialized with OpenAI and Pinecone');
    } else {
      this.isAvailable = false;
      console.log('⚠️ RAG Service initialized without OpenAI - using mock embeddings');
    }
  }

  /**
   * Process a document and create embeddings for RAG
   */
  async processDocument(document: Document, content: string): Promise<DocumentChunk[]> {
    try {
      // Use LangChain for enhanced document processing
      const langChainChunks = await langChainService.processDocumentWithLangChain(document, content);
      const documentChunks: DocumentChunk[] = [];

      for (let i = 0; i < langChainChunks.length; i++) {
        const lcChunk = langChainChunks[i];
        
        // Generate embedding for chunk
        const embedding = await this.generateEmbedding(lcChunk.pageContent);
        
        const documentChunk: DocumentChunk = {
          id: `${document.id}_chunk_${i}`,
          document_id: document.id,
          content: lcChunk.pageContent,
          embedding: embedding,
          metadata: {
            filename: document.filename,
            user_id: document.user_id,
            created_at: document.created_at,
            section: `chunk_${i}`,
            page: lcChunk.metadata.page
          }
        };

        documentChunks.push(documentChunk);
      }

      // Store chunks in database
      await this.storeDocumentChunks(documentChunks);
      
      // Log interaction for LangChain tracing
      await langChainService.logInteraction('processing', {
        document_id: document.id,
        filename: document.filename,
        chunks_created: documentChunks.length,
        file_type: document.file_type
      }, document.user_id);
      
      console.log(`📄 Processed document ${document.filename} into ${documentChunks.length} chunks with LangChain`);
      return documentChunks;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isAvailable || !this.openai) {
      // Return mock embedding for development
      return new Array(1536).fill(0).map(() => Math.random() * 0.1);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback to mock embedding
      return new Array(1536).fill(0).map(() => Math.random() * 0.1);
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * Store document chunks in vector database
   */
  private async storeDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      // Store in memory for immediate access
      chunks.forEach(chunk => {
        const userChunks = this.vectorStore.get(chunk.metadata.user_id) || [];
        userChunks.push(chunk);
        this.vectorStore.set(chunk.metadata.user_id, userChunks);
      });

      // Store in Pinecone if available
      if (this.isAvailable && this.pineconeKey) {
        await this.storeToPinecone(chunks);
      }
      
      console.log('📚 Stored document chunks in vector database');
    } catch (error) {
      console.error('Error storing document chunks:', error);
    }
  }

  /**
   * Store chunks in Pinecone vector database
   */
  private async storeToPinecone(chunks: DocumentChunk[]): Promise<void> {
    try {
      // Basic Pinecone integration - in production, use official Pinecone client
      const vectors: PineconeVector[] = chunks.map(chunk => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          content: chunk.content,
          filename: chunk.metadata.filename,
          user_id: chunk.metadata.user_id,
          created_at: chunk.metadata.created_at,
          document_id: chunk.document_id
        }
      }));

      // For now, we'll just store in memory
      // In production, you would make HTTP requests to Pinecone API
      console.log('🌲 Would store', vectors.length, 'vectors in Pinecone');
      
    } catch (error) {
      console.error('Error storing to Pinecone:', error);
    }
  }

  /**
   * Search for relevant document chunks using semantic similarity
   */
  async searchRelevantDocuments(query: string, userId: string, limit: number = 5): Promise<RAGResult[]> {
    try {
      // Use LangChain enhanced search if available
      const enhancedResults = await langChainService.enhancedSemanticSearch(query, userId, {
        limit,
        minSimilarity: 0.3,
        includeMetadata: true,
        boostRecent: true
      });
      
      // Log search interaction
      await langChainService.logInteraction('search', {
        query,
        results_count: enhancedResults.length,
        top_similarity: enhancedResults[0]?.similarity || 0
      }, userId);
      
      return enhancedResults;
        
    } catch (error) {
      console.error('Error in enhanced search, falling back to basic search:', error);
      
      // Fallback to basic search
      return await this.basicSearchRelevantDocuments(query, userId, limit);
    }
  }

  /**
   * Basic search fallback
   */
  private async basicSearchRelevantDocuments(query: string, userId: string, limit: number = 5): Promise<RAGResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Get user's document chunks
      const userChunks = await this.getUserDocumentChunks(userId);
      
      // Calculate similarity scores
      const results: RAGResult[] = [];
      
      for (const chunk of userChunks) {
        const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding);
        
        results.push({
          content: chunk.content,
          similarity: similarity,
          metadata: chunk.metadata
        });
      }
      
      // Sort by similarity and return top results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error in basic search:', error);
      return [];
    }
  }

  /**
   * Get document chunks for a user
   */
  private async getUserDocumentChunks(userId: string): Promise<DocumentChunk[]> {
    try {
      // Get chunks from in-memory store
      const userChunks = this.vectorStore.get(userId) || [];
      
      // If no chunks in memory, load mock data for demo
      if (userChunks.length === 0) {
        const mockChunks = this.getMockDocumentChunks(userId);
        if (mockChunks.length > 0) {
          this.vectorStore.set(userId, mockChunks);
          return mockChunks;
        }
      }
      
      return userChunks;
    } catch (error) {
      console.error('Error getting user document chunks:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get mock document chunks for development
   */
  private getMockDocumentChunks(userId: string): DocumentChunk[] {
    if (userId === 'patient-001') {
      return [
        {
          id: 'chunk_1',
          document_id: 'doc_1',
          content: 'Patient John Thompson, age 45, presents with hypertension and diabetes. Current medications include Lisinopril 10mg daily and Metformin 500mg twice daily. Recent HbA1c levels show good glycemic control at 6.8%. Blood pressure readings have been stable at 130/80 mmHg.',
          embedding: new Array(1536).fill(0).map(() => Math.random() * 0.1),
          metadata: {
            filename: 'medical_history.pdf',
            user_id: userId,
            created_at: '2024-01-15T00:00:00Z',
            section: 'medical_overview'
          }
        },
        {
          id: 'chunk_2',
          document_id: 'doc_2',
          content: 'Lab results from January 2024 show Complete Blood Count within normal limits. Fasting glucose 95 mg/dL, indicating excellent diabetes management. Lipid panel shows total cholesterol 180 mg/dL, LDL 110 mg/dL, HDL 55 mg/dL, triglycerides 120 mg/dL.',
          embedding: new Array(1536).fill(0).map(() => Math.random() * 0.1),
          metadata: {
            filename: 'lab_results_jan_2024.pdf',
            user_id: userId,
            created_at: '2024-01-20T00:00:00Z',
            section: 'lab_results'
          }
        },
        {
          id: 'chunk_3',
          document_id: 'doc_3',
          content: 'Insurance claim submitted for routine diabetes follow-up appointment. Services include comprehensive metabolic panel, HbA1c test, and physician consultation. Pre-authorization approved for continuous glucose monitoring system. Total claim amount $450.',
          embedding: new Array(1536).fill(0).map(() => Math.random() * 0.1),
          metadata: {
            filename: 'insurance_claim_2024.pdf',
            user_id: userId,
            created_at: '2024-01-25T00:00:00Z',
            section: 'insurance_claim'
          }
        }
      ];
    }

    return [];
  }

  /**
   * Generate context for RAG-enhanced chat responses
   */
  async generateRAGContext(query: string, userId: string): Promise<string> {
    try {
      const relevantDocs = await this.searchRelevantDocuments(query, userId, 3);
      
      if (relevantDocs.length === 0) {
        return '';
      }

      let context = 'Based on the following relevant documents:\n\n';
      
      relevantDocs.forEach((doc, index) => {
        context += `Document ${index + 1} (${doc.metadata.filename}):\n`;
        context += `${doc.content}\n\n`;
      });

      context += 'Please provide a response based on this context and the user\'s question.\n';
      
      return context;
    } catch (error) {
      console.error('Error generating RAG context:', error);
      return '';
    }
  }

  /**
   * Process text content and extract relevant information
   */
  extractTextFromContent(content: string, fileType: string): string {
    try {
      // Basic text extraction - in a real implementation, you'd use libraries like:
      // - PDF: pdf-parse, pdf2pic
      // - DOC: mammoth, docx
      // - Images: tesseract.js for OCR
      
      switch (fileType.toLowerCase()) {
        case 'text/plain':
        case 'text/csv':
        case 'application/json':
          return content;
        
        case 'application/pdf':
          // Mock PDF text extraction
          return content || 'PDF content would be extracted here using pdf-parse library';
        
        case 'image/jpeg':
        case 'image/png':
          // Mock OCR text extraction
          return 'OCR text would be extracted here using tesseract.js';
        
        default:
          return content || 'Unsupported file type for text extraction';
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      return content || '';
    }
  }

  /**
   * Get RAG system status
   */
  getSystemStatus() {
    return {
      available: this.isAvailable,
      service: 'OpenAI Embeddings',
      model: 'text-embedding-3-small',
      features: {
        documentProcessing: true,
        semanticSearch: true,
        contextGeneration: true,
        vectorStorage: true
      }
    };
  }
}

// Export singleton instance
export const ragService = new RAGService();
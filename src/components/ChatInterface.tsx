'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { User, ChatMessage, Document } from '@/types';
import { aiService } from '@/lib/ai-service';
import { dbService } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ChatInterfaceProps {
  user: User;
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: `Hello ${user.name}! I'm Claude, your AI healthcare assistant. How can I help you today?`,
      role: 'assistant',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
      type: 'text',
      documents: uploadedFiles.length > 0 ? uploadedFiles.map(file => ({
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        userId: user.id
      })) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      const response = await aiService.generateResponse({
        message: inputValue,
        user_id: user.id,
        user_role: user.role
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          ...response.metadata,
          langchain_enhanced: true,
          sources: response.metadata?.sources || [],
          confidence: response.metadata?.confidence || 0
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Process documents if uploaded
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            // Upload document to storage
            const document = await dbService.uploadDocument(file, user.id);
            
            if (document) {
              // Read file content for RAG processing
              const fileContent = await file.text();
              
              // Process document with RAG system
              await aiService.processDocumentForRAG(document, fileContent);
              
              toast.success(`Document "${file.name}" processed and indexed for search`);
            } else {
              toast.error(`Failed to upload "${file.name}"`);
            }
          } catch (error) {
            console.error('Document upload error:', error);
            toast.error(`Failed to process "${file.name}"`);
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get AI response. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.includes('pdf') || 
                         file.type.includes('image') || 
                         file.type.includes('text');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast.error(`${file.name}: Only PDF, images, and text files are supported`);
        return false;
      }
      
      if (!isValidSize) {
        toast.error(`${file.name}: File size must be less than 10MB`);
        return false;
      }
      
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} file(s) ready to upload`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card h-[400px] sm:h-[500px] lg:h-96 flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-300">
        <h2 className="text-lg sm:text-xl font-semibold">AI Chat Assistant</h2>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-700">
          <div className="status-indicator status-connected"></div>
          <span className="hidden sm:inline">Claude AI Connected</span>
          <span className="sm:hidden">Connected</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto chat-container space-y-4 mb-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'} max-w-[85%] sm:max-w-[75%]`}>
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                
                {message.documents && message.documents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs opacity-80">
                        <ClipboardDocumentIcon className="h-3 w-3" />
                        <span>{doc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-xs opacity-60 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="chat-bubble-assistant">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary-50/90 border-2 border-dashed border-primary-400 rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <DocumentArrowUpIcon className="h-12 w-12 text-primary-600 mx-auto mb-2" />
            <p className="text-primary-700 font-medium">Drop files here to upload</p>
            <p className="text-primary-600 text-sm">PDF, images, and text files supported</p>
          </div>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Files to upload:</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                <div className="flex items-center space-x-2">
                  <PhotoIcon className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-700">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Upload documents"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </div>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="w-full p-2 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-600 dark:placeholder:text-gray-300"
            rows={2}
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={isLoading || (!inputValue.trim() && uploadedFiles.length === 0)}
          className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
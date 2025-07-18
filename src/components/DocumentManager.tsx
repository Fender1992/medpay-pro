'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  DocumentArrowUpIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { User, Document } from '@/types';
import { dbService } from '@/lib/supabase';
import DocumentSearch from './DocumentSearch';

interface DocumentManagerProps {
  user: User;
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  type: 'medical' | 'administrative' | 'tax' | 'insurance';
  icon: React.ReactNode;
}

export default function DocumentManager({ user }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFormTemplates, setShowFormTemplates] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [formType, setFormType] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      const userDocuments = await dbService.getUserDocuments(user.id);
      setDocuments(userDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const getFormTemplates = (): FormTemplate[] => {
    const baseTemplates: FormTemplate[] = [
      {
        id: 'medical-history',
        name: 'Medical History Form',
        description: 'Comprehensive medical history questionnaire',
        type: 'medical',
        icon: <UserIcon className="h-5 w-5" />
      },
      {
        id: 'consent-form',
        name: 'Treatment Consent Form',
        description: 'Patient consent for medical treatment',
        type: 'medical',
        icon: <DocumentTextIcon className="h-5 w-5" />
      },
      {
        id: 'insurance-claim',
        name: 'Insurance Claim Form',
        description: 'Medical insurance claim documentation',
        type: 'insurance',
        icon: <ClipboardDocumentIcon className="h-5 w-5" />
      }
    ];

    // Add admin-specific templates
    if (user.role === 'admin') {
      baseTemplates.push(
        {
          id: 'tax-summary',
          name: 'Tax Summary Report',
          description: 'Annual tax summary for company metrics',
          type: 'tax',
          icon: <CurrencyDollarIcon className="h-5 w-5" />
        },
        {
          id: 'analytics-report',
          name: 'Analytics Report',
          description: 'Platform performance and user metrics',
          type: 'administrative',
          icon: <ChartBarIcon className="h-5 w-5" />
        },
        {
          id: 'compliance-audit',
          name: 'Compliance Audit Form',
          description: 'HIPAA compliance audit documentation',
          type: 'administrative',
          icon: <DocumentArrowUpIcon className="h-5 w-5" />
        }
      );
    }

    return baseTemplates;
  };

  const generateForm = async (template: FormTemplate) => {
    setIsGenerating(true);
    setFormType(template.name);
    setShowFormTemplates(false);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: template.name,
          templateType: template.type,
          user: user
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document');
      }
      
      const data = await response.json();
      setGeneratedContent(data.content);
      
    } catch (error) {
      console.error('Error generating form:', error);
      setGeneratedContent('Error generating form. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'administrative': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'tax': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'insurance': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Document Search */}
      <DocumentSearch user={user} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Document Manager</h2>
          <p className="text-gray-700 dark:text-gray-400">Manage and generate healthcare documents</p>
        </div>
        <button
          onClick={() => setShowFormTemplates(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Generate Form</span>
        </button>
      </div>

      {/* Form Templates Modal */}
      <AnimatePresence>
        {showFormTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowFormTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Generate Document
                </h3>
                <button
                  onClick={() => setShowFormTemplates(false)}
                  className="text-gray-600 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-4">
                {getFormTemplates().map((template) => (
                  <motion.button
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => generateForm(template)}
                    className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {template.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-start sm:self-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(template.type)}`}>
                        {template.type}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Content */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <div className="flex items-center justify-center space-x-3 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 dark:text-gray-400">Generating {formType}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {generatedContent && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Generated: {formType}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(generatedContent)}
                  className="btn-secondary p-2"
                  title="Copy to clipboard"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => downloadDocument(generatedContent, `${formType.replace(/\s+/g, '_')}.txt`)}
                  className="btn-secondary p-2"
                  title="Download document"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setGeneratedContent('')}
                  className="btn-secondary p-2"
                  title="Clear"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                {generatedContent}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Documents */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Your Documents ({documents.length})
        </h3>
        
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-400">No documents uploaded yet</p>
            <p className="text-sm text-gray-700 dark:text-gray-500 mt-2">
              Upload documents through the chat interface or generate forms above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3 sm:space-y-0"
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {doc.filename}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-700 dark:text-gray-400">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{doc.file_type}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedDocument(doc)}
                    className="btn-secondary p-2"
                    title="View document"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    className="btn-secondary p-2"
                    title="Share document"
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
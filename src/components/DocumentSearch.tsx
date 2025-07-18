'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { User } from '@/types';
import { aiService } from '@/lib/ai-service';
import { ragService } from '@/lib/rag-service';

interface DocumentSearchProps {
  user: User;
}

interface SearchResult {
  content: string;
  similarity: number;
  metadata: {
    filename: string;
    user_id: string;
    created_at: string;
    section?: string;
  };
}

export default function DocumentSearch({ user }: DocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    const startTime = performance.now();

    try {
      // Search documents using RAG
      const searchResults = await ragService.searchRelevantDocuments(query, user.id, 5);
      
      const endTime = performance.now();
      setSearchTime(endTime - startTime);
      
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        console.log('No relevant documents found for:', query);
      }
      
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.8) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
    if (similarity > 0.6) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
  };

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-6">
        <SparklesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          AI Document Search
        </h2>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your documents using AI (e.g., 'What are my current medications?')"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={isSearching}
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Searching...</span>
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Search Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Search Stats */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pb-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-4">
                <span>Found {results.length} relevant documents</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  LangChain Enhanced
                </span>
              </div>
              {searchTime && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>Search completed in {searchTime.toFixed(0)}ms</span>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="space-y-4">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {result.metadata.filename}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(result.metadata.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(result.similarity)}`}>
                        {formatSimilarity(result.similarity)} match
                      </span>
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p className="mb-2 font-medium">Relevant content:</p>
                    <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-600">
                      {truncateText(result.content)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      {!isSearching && results.length === 0 && query && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No documents found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try rephrasing your search or upload some documents first
          </p>
        </motion.div>
      )}

      {/* Help Text */}
      {results.length === 0 && !query && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                AI-Powered Document Search
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Search through your documents using natural language. Ask questions like:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• &ldquo;What medications am I currently taking?&rdquo;</li>
                <li>• &ldquo;Show me my latest lab results&rdquo;</li>
                <li>• &ldquo;What did my last doctor visit say?&rdquo;</li>
                <li>• &ldquo;Find information about my blood pressure&rdquo;</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
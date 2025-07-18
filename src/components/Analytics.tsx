'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { User, PlatformStats } from '@/types';
import { dbService } from '@/lib/supabase';

interface AnalyticsProps {
  user: User;
}

export default function Analytics({ user }: AnalyticsProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadStats();
  }, [user.id, timeRange]);

  const loadStats = async () => {
    try {
      const data = await dbService.getPlatformStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  const getMetricColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card text-center py-8">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Analytics Unavailable</h3>
        <p className="text-gray-600 dark:text-gray-400">Unable to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Platform performance and health insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between mb-2">
            <UsersIcon className="h-8 w-8 text-blue-500" />
            {getTrendIcon(stats.userGrowth)}
          </div>
          <div className="metric-value">{(stats.totalUsers || 0).toLocaleString()}</div>
          <div className="metric-label">Total Users</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatTrend(stats.userGrowth || 0)} vs last period
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between mb-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-500" />
            {getTrendIcon(stats.chatGrowth)}
          </div>
          <div className="metric-value">{(stats.totalChats || 0).toLocaleString()}</div>
          <div className="metric-label">AI Conversations</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatTrend(stats.chatGrowth || 0)} vs last period
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between mb-2">
            <DocumentTextIcon className="h-8 w-8 text-purple-500" />
            {getTrendIcon(stats.documentGrowth)}
          </div>
          <div className="metric-value">{(stats.totalDocuments || 0).toLocaleString()}</div>
          <div className="metric-label">Documents Processed</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatTrend(stats.documentGrowth || 0)} vs last period
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="h-8 w-8 text-orange-500" />
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </div>
          <div className="metric-value">{(stats.avgResponseTime || 0).toFixed(1)}s</div>
          <div className="metric-label">Avg Response Time</div>
          <div className="text-xs text-gray-500 mt-1">
            {(stats.avgResponseTime || 0) < 2 ? 'Excellent' : (stats.avgResponseTime || 0) < 5 ? 'Good' : 'Needs Improvement'}
          </div>
        </motion.div>
      </div>

      {/* User Activity by Role */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">User Activity by Role</h3>
          <div className="space-y-4">
            {(stats.usersByRole || []).map((role, index) => (
              <div key={role.role} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    role.role === 'admin' ? 'bg-blue-500' :
                    role.role === 'provider' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`}></div>
                  <span className="font-medium capitalize">{role.role}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{role.count || 0}</div>
                  <div className="text-sm text-gray-500">
                    {(((role.count || 0) / (stats.totalUsers || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Uptime</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold">99.9%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database Performance</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold">Excellent</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Response Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold">98.5%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Document Processing</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-semibold">92.1%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="card"
      >
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {(stats.recentActivity || []).map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'chat' ? 'bg-green-500' :
                  activity.type === 'document' ? 'bg-blue-500' :
                  activity.type === 'user' ? 'bg-purple-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm text-gray-900 dark:text-gray-100">{activity.description}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(activity.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Performance Insights */}
      {user.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Top Performing Features</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">AI Chat</span>
                  <span className="text-sm font-medium text-green-600">+15% usage</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Document Analysis</span>
                  <span className="text-sm font-medium text-green-600">+12% usage</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Health Summaries</span>
                  <span className="text-sm font-medium text-green-600">+8% usage</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Areas for Improvement</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">User Onboarding</span>
                  <span className="text-sm font-medium text-yellow-600">Moderate</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mobile Experience</span>
                  <span className="text-sm font-medium text-yellow-600">Needs Work</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Handling</span>
                  <span className="text-sm font-medium text-red-600">Critical</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  HomeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UsersIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { User, HealthRecord } from '@/types';
import { dbService } from '@/lib/supabase';
import { AIService } from '@/lib/ai-service';
import ChatInterface from './ChatInterface';
import HealthSummary from './HealthSummary';
import SystemStatus from './SystemStatus';
import DocumentManager from './DocumentManager';
import UserManagement from './UserManagement';
import UserProfile from './UserProfile';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveTab = 'overview' | 'chat' | 'documents' | 'users' | 'profile' | 'settings';

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthData, setHealthData] = useState<HealthRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User>(user);

  useEffect(() => {
    // Set sidebar open by default on desktop
    const checkScreenSize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const loadHealthData = useCallback(async () => {
    if (user.role === 'user') {
      try {
        const data = await dbService.getHealthData(user.id);
        setHealthData(data);
      } catch (error) {
        console.error('Error loading health data:', error);
      }
    }
    setIsLoading(false);
  }, [user.id, user.role]);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const navigation = [
    {
      id: 'overview' as ActiveTab,
      name: 'Overview',
      icon: HomeIcon,
      description: 'Dashboard overview'
    },
    {
      id: 'chat' as ActiveTab,
      name: 'AI Chat',
      icon: ChatBubbleLeftRightIcon,
      description: 'Chat with Claude AI'
    },
    {
      id: 'documents' as ActiveTab,
      name: 'Documents',
      icon: DocumentTextIcon,
      description: 'Medical documents'
    },
    ...(currentUser.role === 'admin' ? [{
      id: 'users' as ActiveTab,
      name: 'User Management',
      icon: UsersIcon,
      description: 'Manage platform users'
    }] : []),
    {
      id: 'profile' as ActiveTab,
      name: 'Profile',
      icon: UserIcon,
      description: 'Your profile settings'
    },
    {
      id: 'settings' as ActiveTab,
      name: 'Settings',
      icon: Cog6ToothIcon,
      description: 'System settings'
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'provider':
        return 'bg-green-100 text-green-800';
      case 'user':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return '👔';
      case 'provider':
        return '👨‍⚕️';
      case 'user':
        return '🤒';
      default:
        return '👤';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: sidebarOpen ? 0 : -320 }}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-y-0 left-0 z-50 w-80 max-w-[90vw] bg-white shadow-lg border-r border-gray-300"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="medical-header">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏥</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">MedChat AI Pro</h1>
                    <p className="text-white/80 text-sm">Intelligent Healthcare</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              {/* User Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    {getRoleIcon(user.role)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{user.name}</h2>
                    <p className="text-white/80 text-sm truncate">{user.title}</p>
                    <p className="text-white/60 text-xs truncate">{user.facility}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full sidebar-nav-item ${
                  activeTab === item.id ? 'active' : ''
                }`}
              >
                <item.icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-700">{item.description}</div>
                </div>
              </button>
            ))}
          </nav>

          {/* System Status */}
          <div className="p-4 border-t border-gray-300">
            <SystemStatus />
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-300">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-80' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-300 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {navigation.find(item => item.id === activeTab)?.name}
                </h1>
                <p className="text-gray-700">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-700">{user.email}</p>
              </div>
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xl">{getRoleIcon(user.role)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 order-2 lg:order-1">
                    <ChatInterface user={user} />
                  </div>
                  <div className="order-1 lg:order-2">
                    <HealthSummary user={user} healthData={healthData} />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'chat' && (
              <div className="max-w-4xl mx-auto">
                <ChatInterface user={user} />
              </div>
            )}
            
            {activeTab === 'documents' && (
              <DocumentManager user={user} />
            )}
            
            {activeTab === 'users' && currentUser.role === 'admin' && (
              <UserManagement currentUser={currentUser} />
            )}
            
            {activeTab === 'profile' && (
              <UserProfile 
                user={currentUser} 
                onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)} 
              />
            )}
            
            {activeTab === 'settings' && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">System Settings</h2>
                <SystemStatus detailed />
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
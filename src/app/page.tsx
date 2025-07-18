'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon, 
  ShieldCheckIcon, 
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import LoginForm from '@/components/LoginForm';
import ThemeToggle from '@/components/ThemeToggle';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import { User } from '@/types';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (from localStorage or session)
    const savedUser = localStorage.getItem('medchat-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('medchat-user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('medchat-user', JSON.stringify(userData));
    
    // Check if this is the user's first login
    if (userData.first_login) {
      setShowPasswordChange(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('medchat-user');
    setShowPasswordChange(false);
  };

  const handlePasswordChanged = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('medchat-user', JSON.stringify(updatedUser));
    setShowPasswordChange(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <>
        <Dashboard user={user} onLogout={handleLogout} />
        {showPasswordChange && (
          <PasswordChangeModal 
            user={user} 
            onPasswordChanged={handlePasswordChanged} 
            onClose={() => setShowPasswordChange(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-medical-600/20"></div>
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <HeartIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6">
              MedChat AI Pro
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Intelligent Healthcare Assistant powered by Claude AI, OpenAI, and Supabase
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-300">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Claude AI Integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-time Analytics</span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Revolutionizing Healthcare Communication
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8">
                Experience the future of healthcare with our AI-powered platform that integrates 
                seamlessly with your workflow, providing intelligent insights and streamlined communication.
              </p>
            </div>

            <div className="grid gap-6">
              {[
                {
                  icon: ChatBubbleBottomCenterTextIcon,
                  title: 'AI-Powered Conversations',
                  description: 'Chat with Claude AI for medical insights, drug interactions, and clinical decision support.'
                },
                {
                  icon: DocumentTextIcon,
                  title: 'Smart Document Processing',
                  description: 'Upload PDFs, images, and medical records for instant AI analysis and insights.'
                },
                {
                  icon: ChartBarIcon,
                  title: 'Advanced Analytics',
                  description: 'Real-time platform metrics, health trends, and operational insights.'
                },
                {
                  icon: UserGroupIcon,
                  title: 'Role-Based Access',
                  description: 'Customized experiences for administrators, healthcare providers, and patients.'
                },
                {
                  icon: ShieldCheckIcon,
                  title: 'HIPAA Compliance',
                  description: 'Enterprise-grade security with end-to-end encryption and audit logging.'
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Login Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:pl-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Access Your Healthcare Dashboard
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Sign in to access your personalized healthcare assistant
                </p>
              </div>

              <LoginForm onLogin={handleLogin} />

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Demo Accounts</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Administrator</span>
                      <span className="text-gray-600 dark:text-gray-400">admin@medchat.ai / admin123</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Healthcare Provider</span>
                      <span className="text-gray-600 dark:text-gray-400">doctor@medchat.ai / doctor123</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Patient</span>
                      <span className="text-gray-600 dark:text-gray-400">patient@medchat.ai / patient123</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <HeartIcon className="h-8 w-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">MedChat AI Pro</h3>
            <p className="text-gray-400 mb-4">
              Intelligent Healthcare Assistant • HIPAA Compliant • Powered by Claude AI
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>Version 3.0.0</span>
              <span>•</span>
              <span>Enterprise Ready</span>
              <span>•</span>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
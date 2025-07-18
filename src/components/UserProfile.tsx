'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { User } from '@/types';
import { dbService } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface UserProfileProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  title: string;
  department: string;
  facility: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfile({ user, onUserUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name,
    email: user.email,
    title: user.title || '',
    department: user.department || '',
    facility: user.facility || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedUser: User = {
        ...user,
        name: formData.name,
        title: formData.title,
        department: formData.department,
        facility: formData.facility
      };

      await dbService.updateUser(updatedUser);
      onUserUpdate(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await dbService.changePassword(user.id, formData.currentPassword, formData.newPassword);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setIsChangingPassword(false);
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password. Please check your current password.');
    } finally {
      setIsLoading(false);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'provider':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'user':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'provider':
        return 'Healthcare Provider';
      case 'user':
        return 'Patient';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-3xl">
            {getRoleIcon(user.role)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
            <p className="text-gray-700 dark:text-gray-400">{user.email}</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getRoleColor(user.role)}`}>
              {getRoleName(user.role)}
            </span>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user.title && (
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-400">
              <BriefcaseIcon className="h-4 w-4" />
              <span>{user.title}</span>
            </div>
          )}
          {user.department && (
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-400">
              <AcademicCapIcon className="h-4 w-4" />
              <span>{user.department}</span>
            </div>
          )}
          {user.facility && (
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-400">
              <BuildingOfficeIcon className="h-4 w-4" />
              <span>{user.facility}</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-sm"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Title
                </label>
                <div className="relative">
                  <BriefcaseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Senior Physician, RN, Patient"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <div className="relative">
                  <AcademicCapIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Cardiology, Emergency, Oncology"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Healthcare Facility
                </label>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    value={formData.facility}
                    onChange={(e) => setFormData(prev => ({ ...prev, facility: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., General Hospital, Medical Center"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user.name,
                    email: user.email,
                    title: user.title || '',
                    department: user.department || '',
                    facility: user.facility || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Full Name
              </label>
              <p className="text-gray-900 dark:text-white">{user.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Email Address
              </label>
              <p className="text-gray-900 dark:text-white">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Job Title
              </label>
              <p className="text-gray-900 dark:text-white">{user.title || 'Not specified'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Department
              </label>
              <p className="text-gray-900 dark:text-white">{user.department || 'Not specified'}</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Healthcare Facility
              </label>
              <p className="text-gray-900 dark:text-white">{user.facility || 'Not specified'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Password Change */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password & Security</h3>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="btn-secondary text-sm"
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full pr-10 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                >
                  {showCurrentPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full pr-10 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                >
                  {showNewPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full pr-10 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                >
                  {showConfirmPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  }));
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
                <span>Change Password</span>
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-gray-700 dark:text-gray-400">
              Your password was last changed on {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}.
            </p>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Password Requirements</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• At least 6 characters long</li>
                <li>• Contains a mix of letters and numbers</li>
                <li>• Avoid using personal information</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
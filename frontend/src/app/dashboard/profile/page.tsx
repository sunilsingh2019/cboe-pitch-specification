'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'change-password'>('profile');
  
  // Change password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset messages
    setError(null);
    setSuccess(null);
    
    // Form validation
    if (!oldPassword) {
      setError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      await changePassword(oldPassword, newPassword, confirmPassword);
      setSuccess('Password changed successfully');
      
      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Change password error:', err);
      if (err.response?.data?.old_password) {
        setError(err.response.data.old_password);
      } else if (err.response?.data?.new_password) {
        setError(err.response.data.new_password);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('profile')}
            className={`mr-4 py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'profile'
                ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('change-password')}
            className={`mr-4 py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'change-password'
                ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change Password
          </button>
        </nav>
      </div>
      
      {/* Profile details tab */}
      {activeTab === 'profile' && user && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-[var(--accent-color)]">Your Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 mb-1">Full Name</p>
              <p className="font-medium text-gray-900 mb-4">{user.first_name} {user.last_name}</p>
              
              <p className="text-gray-600 mb-1">Username</p>
              <p className="font-medium text-gray-900">{user.username}</p>
            </div>
            
            <div>
              <p className="text-gray-600 mb-1">Email Address</p>
              <p className="font-medium text-gray-900 mb-4">{user.email}</p>
              
              <p className="text-gray-600 mb-1">User ID</p>
              <p className="font-medium text-gray-900">#{user.id}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Change password tab */}
      {activeTab === 'change-password' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-[var(--accent-color)]">Change Your Password</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleChangePassword}>
            <div className="mb-4">
              <label htmlFor="oldPassword" className="block text-gray-700 mb-2">
                Current Password
              </label>
              <input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgba(84,207,99,0.5)] focus:border-[var(--accent-color)]"
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgba(84,207,99,0.5)] focus:border-[var(--accent-color)]"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters
              </p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgba(84,207,99,0.5)] focus:border-[var(--accent-color)]"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className={`w-full bg-[var(--accent-color)] text-white py-2 px-4 rounded-md font-medium 
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[var(--accent-hover)]'}`}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
} 
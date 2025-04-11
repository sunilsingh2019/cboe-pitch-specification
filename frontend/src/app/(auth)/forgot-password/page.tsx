'use client';

import React, { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { showNotification } = useNotification();

  // Get API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      showNotification('error', 'Please enter your email address');
      return;
    }
    
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/api/auth/password-reset/`, { email });
      
      setSuccess(true);
      showNotification('success', 'Password reset instructions have been sent to your email');
      
      // Redirect to login page after a delay
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } catch (error: any) {
      console.error('Error requesting password reset:', error);
      // Always show success message even if the email doesn't exist (for security)
      setSuccess(true);
      showNotification('success', 'If your email exists in our system, you will receive password reset instructions');
      
      // Redirect to login page after a delay
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we&apos;ll send you instructions to reset your password
          </p>
        </div>
        
        {success ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">Check Your Email</h3>
            <p className="text-gray-500 mb-6">
              We&apos;ve sent password reset instructions to your email address.
              Please check your inbox and follow the link to reset your password.
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Redirecting you to login page in a few seconds...
            </p>
            <Link 
              href="/login" 
              className="text-[rgb(84,207,99)] hover:text-[rgb(76,186,89)] font-medium"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)] focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading ? 'bg-gray-400' : 'bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)]'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(84,207,99)]`}
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-sm">
                <Link href="/login" className="font-medium text-[rgb(84,207,99)] hover:text-[rgb(76,186,89)]">
                  Remember your password? Login
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 
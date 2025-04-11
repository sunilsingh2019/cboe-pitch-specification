'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const { showNotification } = useNotification();

  // Get token from URL
  const token = params?.token as string;

  // Get API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  // Validate token on page load
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    const validateToken = async () => {
      try {
        setStatus('verifying');
        const apiUrl = getApiUrl();
        // Clear any existing auth headers
        delete axios.defaults.headers.common['Authorization'];
        
        // Check if token exists
        const response = await axios.get(`${apiUrl}/api/auth/check-token/${token}/`);
        
        // For password reset, we don't care if the account is verified or not
        // We only care if the token is valid
        if (response.data?.token_valid) {
          setStatus('idle');  // Show the password reset form
        } else {
          setStatus('error');
          setErrorMessage('Invalid reset link. Please request a new password reset.');
          showNotification('error', 'Invalid reset link.');
        }
      } catch (error: any) {
        console.error('Error validating token:', error);
        setStatus('error');
        setErrorMessage('Invalid or expired reset link. Please request a new password reset.');
        showNotification('error', 'Invalid or expired reset link.');
      }
    };
    
    validateToken();
  }, [token, showNotification]);
  
  // Check password strength whenever password changes
  useEffect(() => {
    setPasswordStrength({
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    });
  }, [password]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const isPasswordStrong = () => {
    // Password is strong if at least 4 of the 5 criteria are met
    const criteriaCount = Object.values(passwordStrength).filter(Boolean).length;
    return criteriaCount >= 4;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      showNotification('error', 'Please enter a new password');
      return;
    }
    
    if (password !== confirmPassword) {
      showNotification('error', 'Passwords do not match');
      return;
    }

    // Check if password is strong enough
    if (!isPasswordStrong()) {
      showNotification('error', 'Please use a stronger password');
      return;
    }
    
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      
      // Clear any existing auth headers
      delete axios.defaults.headers.common['Authorization'];
      
      const response = await axios.post(`${apiUrl}/api/auth/password-reset-confirm/`, {
        token,
        new_password: password,
        confirm_password: confirmPassword
      });
      
      setStatus('success');
      showNotification('success', 'Your password has been reset successfully!');
      
      // If tokens are provided, store them
      if (response.data?.access && response.data?.refresh) {
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
      }
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setStatus('error');
      
      // Display appropriate error message
      if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail);
        showNotification('error', error.response.data.detail);
      } else {
        setErrorMessage('Failed to reset password. Please try again or request a new reset link.');
        showNotification('error', 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center">
              <svg className="animate-spin h-10 w-10 text-[rgb(84,207,99)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium">Verifying your reset link...</h3>
          </div>
        </div>
      </div>
    );
  }
  
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">Password Reset Successful</h3>
            <p className="text-gray-500 mb-6">
              Your password has been reset successfully. You will be redirected to the dashboard shortly.
            </p>
            <Link 
              href="/dashboard" 
              className="text-[rgb(84,207,99)] hover:text-[rgb(76,186,89)] font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 text-red-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2 text-red-600">Reset Link Invalid</h3>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Link 
              href="/forgot-password" 
              className="inline-block bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)] focus:z-10 sm:text-sm"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <FaEyeSlash className="text-gray-500" /> : <FaEye className="text-gray-500" />}
                </button>
              </div>
              
              {/* Password strength indicator */}
              <div className="mt-2 space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center ${passwordStrength.length ? 'text-green-500' : 'text-red-500'}`}>
                    {passwordStrength.length ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    <span className="ml-1">At least 8 characters</span>
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasUpperCase ? 'text-green-500' : 'text-red-500'}`}>
                    {passwordStrength.hasUpperCase ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    <span className="ml-1">Uppercase letter</span>
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasLowerCase ? 'text-green-500' : 'text-red-500'}`}>
                    {passwordStrength.hasLowerCase ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    <span className="ml-1">Lowercase letter</span>
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasNumber ? 'text-green-500' : 'text-red-500'}`}>
                    {passwordStrength.hasNumber ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    <span className="ml-1">Number</span>
                  </div>
                  <div className={`flex items-center ${passwordStrength.hasSpecialChar ? 'text-green-500' : 'text-red-500'}`}>
                    {passwordStrength.hasSpecialChar ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    <span className="ml-1">Special character</span>
                  </div>
                </div>
                
                {/* Strength meter */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div 
                    className={`h-1.5 rounded-full ${
                      Object.values(passwordStrength).filter(Boolean).length <= 1
                        ? 'bg-red-500' 
                        : Object.values(passwordStrength).filter(Boolean).length <= 3 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${(Object.values(passwordStrength).filter(Boolean).length / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)] focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? <FaEyeSlash className="text-gray-500" /> : <FaEye className="text-gray-500" />}
                </button>
              </div>
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
              {loading ? 'Resetting...' : 'Reset Password'}
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
      </div>
    </div>
  );
} 
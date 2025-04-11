'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

export default function ResendVerificationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFromUrl, setEmailFromUrl] = useState(false);
  const [isFromRegistration, setIsFromRegistration] = useState(false);
  
  // Get API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  // Email validation
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  // Get email from URL if present and auto-submit if valid
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const fromRegistration = searchParams.get('from') === 'registration';
    
    if (fromRegistration) {
      setIsFromRegistration(true);
      // Show a registration success notification
      showNotification('success', 'Registration successful! A verification email has been sent to your inbox.');
    }
    
    if (emailParam) {
      setEmail(emailParam);
      setEmailFromUrl(true);
      
      // Only auto-submit if email is valid and NOT coming from registration
      // This prevents sending multiple verification emails immediately after registration
      if (validateEmail(emailParam) && !fromRegistration) {
        setAutoSubmitting(true);
        handleResendVerification(emailParam);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  const handleResendVerification = async (emailToSubmit?: string) => {
    const emailToUse = emailToSubmit || email;
    
    if (!emailToUse) {
      setError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(emailToUse)) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/auth/resend-verification/`, { email: emailToUse });
      
      setSuccess(true);
      showNotification('success', 'Verification email has been sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      
      // Check if the error is because the email is already verified - this is actually a success case
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('already verified')) {
        // Show as success with special message, not as error
        setSuccess(true);
        setError(null);
        showNotification('info', 'This email is already verified. You can log in now.');
      } else if (err.response?.status === 404) {
        // Email address doesn't exist in the system
        setError('No account exists with this email address. Please register first.');
        showNotification('error', 'No account exists with this email address.');
        
        // Store the email to use for registration
        sessionStorage.setItem('registration_email', emailToUse);
      } else {
        const errorMessage = err.response?.data?.detail || 'Failed to resend verification email. Please try again.';
        setError(errorMessage);
        showNotification('error', errorMessage);
      }
    } finally {
      setIsLoading(false);
      setAutoSubmitting(false);
    }
  };
  
  // Helper to redirect to register page with the current email
  const handleRegisterWithEmail = () => {
    // Email will be retrieved from sessionStorage on the register page
    router.push('/register');
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleResendVerification();
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-[rgb(84,207,99)]">Resend Verification Email</h1>
        
        {isFromRegistration && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded">
            <p className="font-medium">Your account was successfully created!</p>
            <p className="mt-2">Please check your email inbox for the verification link. If you don't receive the email within a few minutes, you can request a new one.</p>
          </div>
        )}
        
        <p className="text-center text-gray-600 mb-6">
          {emailFromUrl 
            ? 'Verification email has been sent to the address below' 
            : 'Enter your email address to receive a new verification link'
          }
        </p>
        
        {autoSubmitting && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[rgb(84,207,99)] mb-4"></div>
            <p className="text-gray-600">
              Sending verification email to{' '}
              <span className="font-medium">{email}</span>...
            </p>
          </div>
        )}
        
        {!autoSubmitting && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              {emailFromUrl ? (
                <div className="flex items-center w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
                  <span className="text-gray-700 font-medium">{email}</span>
                </div>
              ) : (
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(84,207,99)] focus:border-transparent"
                  placeholder="Your registered email"
                  autoComplete="email"
                />
              )}
              {error && (
                <div className={`mt-2 text-sm rounded p-2 ${
                  error.includes('already verified') 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {error}
                  
                  {error.includes('No account exists') && (
                    <button 
                      onClick={handleRegisterWithEmail}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
                    >
                      Register with {email}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="pt-2">
              {/* Prominent 'Resend Verification Email' button for users coming from registration */}
              {isFromRegistration ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Didn't receive the verification email? Click the button below to send it again.
                  </p>
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : 'Resend Verification Email'}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : emailFromUrl ? 'Resend Verification Email' : 'Send Verification Email'}
                </button>
              )}
            </div>
            
            <div className="flex justify-between mt-6 pt-4 border-t border-gray-100 text-sm">
              <Link href="/login" className="text-[rgb(84,207,99)] hover:underline">
                Back to Login
              </Link>
              {!emailFromUrl && (
                <Link href="/register" className="text-gray-600 hover:underline">
                  Create new account
                </Link>
              )}
            </div>
            
            {error && error.includes('already verified') && (
              <div className="mt-2">
                <Link 
                  href="/login" 
                  className="w-full inline-block text-center bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
                >
                  Go to Login
                </Link>
              </div>
            )}
          </form>
        )}
        
        {!autoSubmitting && success && (
          <div className="text-center py-6 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-green-600">Verification Email Sent!</h2>
            
            {isFromRegistration ? (
              <>
                <p className="text-gray-600 mb-4">
                  We've sent a verification link to <span className="font-medium">{email}</span>.
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Please check your inbox (and spam folder) and click the link in the email to verify your account.
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    If you still don't see the email after a few minutes, you can try again.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-600 mb-6">
                We've sent a verification link to <span className="font-medium">{email}</span>. Please check your inbox and click the link to verify your account.
              </p>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => setSuccess(false)}
                className="w-full bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
              >
                Resend Another Verification Email
              </button>
              
              <Link 
                href="/login" 
                className="w-full inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
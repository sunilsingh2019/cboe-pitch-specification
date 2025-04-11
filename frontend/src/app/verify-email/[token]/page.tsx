'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

export default function VerifyEmailPage({ 
  params 
}: { 
  params: { token: string } 
}) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [status, setStatus] = useState<'verifying' | 'success' | 'already-verified' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ username?: string, email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  // Check if token is valid before full verification
  const checkTokenValidity = async (token: string) => {
    try {
      const apiUrl = getApiUrl();
      console.log('Checking token validity:', token);
      
      // Clear any existing auth headers
      delete axios.defaults.headers.common['Authorization'];
      
      const checkUrl = `${apiUrl}/api/auth/check-token/${token}/`;
      console.log('Checking token at URL:', checkUrl);
      
      const response = await axios.get(checkUrl, {
        timeout: 5000 // 5 second timeout
      });
      
      console.log('Token check response:', response.data);
      
      // If we have user data, store it
      if (response.data?.user) {
        setUserData({
          username: response.data.user.username,
          email: response.data.user.email
        });
      }
      
      // If the user is already verified, show appropriate message
      if (response.data?.is_verified) {
        setStatus('already-verified');
        setErrorMessage(`This email (${response.data.user.email}) is already verified. You can now log in to your account.`);
        showNotification('info', 'This email is already verified. You can now log in.');
        
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/login');
        }, 5000);
        
        return true; // Already verified
      }
      
      return false; // Not verified yet
    } catch (err) {
      console.error('Error checking token validity:', err);
      return false; // Continue with normal verification
    }
  };
  
  useEffect(() => {
    if (params.token) {
      // Debug log the token from the URL
      console.log('Token from URL params:', params.token);
      
      // Ensure token is in the correct format - must be a valid UUID format
      let cleanToken = params.token.trim();
      
      // Check if the token needs to be formatted as a UUID (e.g. add hyphens if missing)
      if (cleanToken.length === 32 && !cleanToken.includes('-')) {
        // Format as UUID with hyphens (8-4-4-4-12 format)
        cleanToken = `${cleanToken.slice(0, 8)}-${cleanToken.slice(8, 12)}-${cleanToken.slice(12, 16)}-${cleanToken.slice(16, 20)}-${cleanToken.slice(20)}`;
      }
      
      console.log('Formatted token:', cleanToken);
      
      // Try direct verification with properly formatted token
      verifyEmail(cleanToken);
    }
  }, [params.token]);
  
  const verifyEmail = async (token: string) => {
    try {
      setStatus('verifying');
      const apiUrl = getApiUrl();
      
      console.log('Verifying email with token:', token);
      console.log('Using API URL:', apiUrl);
      
      // Clear any existing auth headers to prevent 401 errors
      delete axios.defaults.headers.common['Authorization'];
      
      // Construct the verification URL
      const verificationUrl = `${apiUrl}/api/auth/verify-email/${token}/`;
      console.log('Full verification URL:', verificationUrl);
      
      // Add a timeout to the request to prevent hanging
      const response = await axios.get(verificationUrl, {
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Verification response:', response.data);
      
      // Store user data if available
      if (response.data?.user) {
        setUserData({
          username: response.data.user.username,
          email: response.data.user.email
        });
      }
      
      setStatus('success');
      showNotification('success', 'Your email has been verified successfully!');
      
      // Try to auto-login if tokens are provided
      if (response.data?.access && response.data?.refresh) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        
        // Set the auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Error verifying email:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Try to extract the email from the token check first
      let emailFound = false;
      
      try {
        const checkApiUrl = getApiUrl();
        const checkUserUrl = `${checkApiUrl}/api/auth/check-token/${token}/`;
        console.log('Checking token info at:', checkUserUrl);
        
        const checkResponse = await axios.get(checkUserUrl, {
          timeout: 5000 // 5 second timeout
        });
        
        console.log('Token check response:', checkResponse.data);
        
        if (checkResponse.data?.user) {
          setUserData({
            username: checkResponse.data.user.username,
            email: checkResponse.data.user.email
          });
          emailFound = true;
        }
      } catch (checkErr: any) {
        console.error('Failed to get user info for token:', checkErr);
      }
      
      // If we couldn't get email from token check, try alternative approach
      if (!emailFound && !userData?.email) {
        try {
          // Try to fetch a user for this session if logged in
          const apiUrl = getApiUrl();
          const meUrl = `${apiUrl}/api/auth/me/`;
          const meResponse = await axios.get(meUrl, { timeout: 3000 });
          
          if (meResponse.data?.email) {
            setUserData({
              username: meResponse.data.username,
              email: meResponse.data.email
            });
            emailFound = true;
          }
        } catch (meErr) {
          console.error('Could not fetch current user:', meErr);
        }
      }
      
      // Special handling for already verified accounts
      if (err.response?.data?.already_verified) {
        setStatus('already-verified');
        const userEmail = err.response?.data?.user?.email || '';
        
        // Update user data if available
        if (err.response?.data?.user) {
          setUserData({
            username: err.response.data.user.username,
            email: err.response.data.user.email
          });
          emailFound = true;
        }
        
        setErrorMessage(`This email ${userEmail ? `(${userEmail})` : ''} is already verified. You can now log in to your account.`);
        showNotification('info', 'This email is already verified. You can now log in.');
        
        // If tokens are provided, store them
        if (err.response?.data?.access && err.response?.data?.refresh) {
          localStorage.setItem('accessToken', err.response.data.access);
          localStorage.setItem('refreshToken', err.response.data.refresh);
          axios.defaults.headers.common['Authorization'] = `Bearer ${err.response.data.access}`;
        }
        
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/login');
        }, 5000);
        return;
      }
      
      // Handle different error cases
      setStatus('error');
      
      // Create a more user-friendly error message
      let friendlyMessage = 'Failed to verify email. The link may be invalid or expired.';
      
      if (err.response?.status === 401) {
        friendlyMessage = 'Authentication error. Please try logging in first.';
        showNotification('error', 'Authentication error. Please try logging in directly.');
      } else if (err.response?.status === 404) {
        friendlyMessage = 'Verification link not found. This link may have been used already or is invalid.';
        showNotification('error', 'Verification link not found. Please try logging in or request a new verification link.');
      } else if (err.response?.status === 400) {
        if (err.response?.data?.expired) {
          friendlyMessage = 'Verification link has expired. Please request a new one.';
        } else if (err.response?.data?.detail) {
          friendlyMessage = err.response.data.detail;
        } else {
          friendlyMessage = 'Invalid verification link. Please request a new one.';
        }
        showNotification('error', 'Verification failed. Please try using the resend option.');
      } else if (err.code === 'ECONNABORTED') {
        friendlyMessage = 'Verification request timed out. Please try again or request a new verification link.';
        showNotification('error', 'Verification request timed out. Please try again.');
      } else {
        friendlyMessage = `Verification failed: ${err.message}. Please try using the resend option.`;
        showNotification('error', 'Verification failed. Please try using the resend option.');
      }
      
      setErrorMessage(friendlyMessage);
    }
  };
  
  // Automatically submit to resend verification if in error state and we have the email
  const handleResendVerification = () => {
    if (userData?.email) {
      router.push(`/resend-verification?email=${encodeURIComponent(userData.email)}`);
    } else {
      router.push('/resend-verification');
    }
  };

  // Function to directly try logging in - the user might already be verified
  const tryLoginDirectly = () => {
    router.push('/login');
  };

  // Function to start over with registration
  const startFreshRegistration = () => {
    router.push('/register');
  };

  // Function to go to resend verification with current email
  const goToResendVerification = (email?: string) => {
    if (email) {
      router.push(`/resend-verification?email=${encodeURIComponent(email)}`);
    } else {
      router.push('/resend-verification');
    }
  };
  
  // Function to regenerate a token and get a direct verification link
  const regenerateToken = async (email: string) => {
    try {
      setIsLoading(true);
      const apiUrl = getApiUrl();
      const regenerateUrl = `${apiUrl}/api/auth/regenerate-verification/${encodeURIComponent(email)}/`;
      
      console.log('Regenerating token at:', regenerateUrl);
      
      const response = await axios.get(regenerateUrl, {
        timeout: 10000
      });
      
      console.log('Regeneration response:', response.data);
      
      // Show success message
      showNotification('success', 'New verification link generated! Please check your email.');
      
      // If we got a direct verification URL, use it
      if (response.data?.verification_url) {
        setTimeout(() => {
          window.location.href = response.data.verification_url;
        }, 3000);
      } else {
        // Otherwise go to resend verification page
        setTimeout(() => {
          router.push(`/resend-verification?email=${encodeURIComponent(email)}&success=true`);
        }, 3000);
      }
      
      return true;
    } catch (err: any) {
      console.error('Error regenerating token:', err);
      
      // If already verified, go to login
      if (err.response?.status === 200 && err.response?.data?.already_verified) {
        showNotification('info', 'Your email is already verified! You can log in now.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return true;
      }
      
      // If user not found, go to register
      if (err.response?.status === 404) {
        showNotification('error', 'Account not found. Please register first.');
        setTimeout(() => {
          router.push('/register');
        }, 2000);
        return false;
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-[rgb(84,207,99)]">Email Verification</h1>
        
        {status === 'verifying' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[rgb(84,207,99)] mb-4"></div>
            <p className="text-gray-600">Verifying your email address...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center py-8 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-green-600">Email Verified!</h2>
            <p className="text-gray-600 mb-2">Your email has been verified successfully.</p>
            {userData?.email && (
              <p className="text-gray-600 mb-6">
                <span className="font-semibold">{userData.email}</span> is now verified.
              </p>
            )}
            <div className="p-4 bg-blue-50 rounded-lg text-blue-700 mb-6">
              <p className="text-sm">You will be redirected to the login page in a few seconds...</p>
            </div>
            <Link 
              href="/login" 
              className="inline-block bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-3 px-8 rounded-lg transition-colors shadow-sm"
            >
              Log In Now
            </Link>
          </div>
        )}
        
        {status === 'already-verified' && (
          <div className="text-center py-8 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-blue-600">Already Verified</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <p className="text-sm text-gray-500 mb-6">Redirecting you to login page...</p>
            
            <div className="space-y-3">
              <Link 
                href="/login"
                className="w-full inline-block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm"
              >
                Login Now
              </Link>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center py-8 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 text-red-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-red-600">Verification Failed</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            
            <div className="p-4 bg-yellow-50 rounded-lg text-yellow-700 mb-6">
              <p className="text-sm mb-2 font-semibold">Why this might be happening:</p>
              <ul className="text-xs text-left list-disc pl-4 mb-2">
                <li>The verification link may have already been used</li>
                <li>Your account might already be verified</li>
                <li>The verification link has expired (valid for 24 hours)</li>
                <li>The token might be incorrect or malformed</li>
              </ul>
              <p className="text-xs text-left mt-2 font-semibold">What you can do:</p>
              <ul className="text-xs text-left list-disc pl-4">
                <li>Try logging in - your account might already be active</li>
                <li>Request a new verification email</li>
                <li>If you just registered, check your email for a verification link</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              {userData?.email && (
                <button
                  onClick={() => regenerateToken(userData.email!)}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm mb-3 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>Get New Verification Link</>
                  )}
                </button>
              )}
              
              <Link 
                href="/login"
                className="w-full inline-block text-center bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)] text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm"
              >
                Try Logging In
              </Link>
              
              <Link 
                href="/resend-verification"
                className="w-full inline-block text-center py-3 px-6 rounded-lg transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {userData?.email ? 'Try Different Email' : 'Request New Verification Email'}
              </Link>
              
              <Link 
                href="/register"
                className="w-full inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors shadow-sm mt-2"
              >
                Create New Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
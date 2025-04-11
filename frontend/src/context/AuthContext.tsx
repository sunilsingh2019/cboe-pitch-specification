'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useNotification } from './NotificationContext';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthResponse {
  data: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean | void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string, newPassword2: string) => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  changePassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Get API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // When running locally, ensure we're using localhost with the correct port
    return typeof window !== 'undefined' 
      ? configuredUrl.replace('http://backend:', 'http://localhost:')
      : configuredUrl;
  };
  
  const apiUrl = getApiUrl();
  
  useEffect(() => {
    let mounted = true;
    
    const checkAuthStatus = async () => {
      console.log('Checking auth status...');
      
      // Remove timeout - we want to check auth in the background without showing a loader
      
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.log('No token found, not authenticated');
        return;
      }
      
      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      try {
        console.log('Fetching user data from API...');
        const userUrl = `${apiUrl}/api/auth/me/`;
        const response = await axios.get(userUrl);
        
        console.log('User data:', response.data);
        
        if (mounted) {
          setUser(response.data);
        }
      } catch (error: any) {
        console.error('Auth check error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // Clear tokens on auth error
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete axios.defaults.headers.common['Authorization'];
        
        if (mounted) {
          setUser(null);
        }
      }
    };
    
    checkAuthStatus();

    return () => {
      mounted = false;
    };
  }, [apiUrl]);
  
  const login = async (username: string, password: string) => {
    try {
      const loginUrl = `${apiUrl}/api/auth/login/`;
      console.log('Attempting login at:', loginUrl);
      
      const response = await axios.post(loginUrl, { 
        username, 
        password 
      });
      
      console.log('Login response:', response.data);
      
      const { access, refresh, user: userData } = response.data;
      
      // Store tokens
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      // Set the user state
      setUser(userData);
      
      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      showNotification('success', 'Login successful! Redirecting to dashboard...');
      
      // Redirect to dashboard
      router.push('/dashboard');
      return true;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Handle email verification requirement
      if (error.response?.status === 403 && error.response?.data?.requires_verification) {
        showNotification('info', 'Email verification required. Please verify your email.');
        
        // Use router instead of throwing error
        router.push(`/resend-verification?email=${encodeURIComponent(username)}`);
        return false;
      } else {
        // Show notification for other login errors
        const errorMessage = error.response?.data?.detail || 'Invalid username or password';
        showNotification('error', errorMessage);
        throw error;
      }
    }
  };
  
  const register = async (userData: RegisterData) => {
    try {
      const registerUrl = `${apiUrl}/api/auth/register/`;
      console.log('Registering user at:', registerUrl);
      
      const response = await axios.post(registerUrl, userData);
      console.log('Registration response:', response.data);
      
      // Check if verification is required from the response
      if (response.data?.requires_verification) {
        console.log('Email verification required from registration response');
        
        // Show a notification about successful registration
        showNotification('success', 'Registration successful! Check your email for the verification link.');
        
        // Redirect to resend-verification page immediately after registration
        router.push(`/resend-verification?email=${encodeURIComponent(userData.email)}&from=registration`);
        
        // Return early to prevent further processing
        return response.data;
      }
      
      // If verification isn't required in the response but is required by policy,
      // the login attempt will throw an error, which we can catch
      try {
        await login(userData.username, userData.password);
      } catch (loginError: any) {
        // If login fails due to verification requirement
        if (loginError.response?.status === 403 && loginError.response?.data?.requires_verification) {
          console.log('Email verification required (detected during login)');
          
          // Redirect to resend-verification page
          showNotification('info', 'Email verification required. Check your inbox or request a new verification link.');
          router.push(`/resend-verification?email=${encodeURIComponent(userData.email)}&from=registration`);
        } else {
          // For other login errors, notify but don't throw
          showNotification('warning', 'Registration successful, but automatic login failed. Please log in manually.');
          router.push('/login');
        }
        return response.data;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // If the registration failed due to verification requirement
      if (error.response?.status === 403 && error.response?.data?.requires_verification) {
        console.log('Email verification required (detected during registration error)');
        window.location.href = `/resend-verification?email=${encodeURIComponent(userData.email)}&from=registration`;
        return;
      }
      
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      const logoutUrl = `${apiUrl}/api/auth/logout/`;
      console.log('Logging out at:', logoutUrl);
      
      await axios.post(logoutUrl);
    } catch (error: any) {
      console.error('Logout error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      // Clear tokens and user data regardless of API response
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      router.push('/');
    }
  };
  
  const changePassword = async (oldPassword: string, newPassword: string, newPassword2: string) => {
    try {
      const changePasswordUrl = `${apiUrl}/api/auth/change-password/`;
      console.log('Changing password at:', changePasswordUrl);
      
      const response = await axios.post(changePasswordUrl, {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2
      });
      
      console.log('Change password response:', response.data);
      
      // Store new tokens
      const { refresh, access } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return response.data;
    } catch (error: any) {
      console.error('Change password error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 
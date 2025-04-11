'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  const { register } = useAuth();
  
  // Check for stored email from verification failure
  useEffect(() => {
    const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('registration_email') : null;
    if (storedEmail) {
      setFormData({
        ...formData,
        email: storedEmail
      });
      // Clear it once used
      sessionStorage.removeItem('registration_email');
    }
  }, []);

  // Check password strength whenever password changes
  useEffect(() => {
    const password = formData.password;
    setPasswordStrength({
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    });
  }, [formData.password]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const isPasswordStrong = () => {
    // Password is strong if at least 4 of the 5 criteria are met
    const criteriaCount = Object.values(passwordStrength).filter(Boolean).length;
    return criteriaCount >= 4;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password || 
        !formData.first_name || !formData.last_name) {
      setError('All fields are required');
      return;
    }

    // Check if password is strong enough
    if (!isPasswordStrong()) {
      setError('Please use a stronger password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Log the API URL for debugging
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('Registration data:', formData);
      
      // Create a username from email for backend compatibility
      const userData = {
        ...formData,
        username: formData.email.split('@')[0], // Use the part before @ as username
        password2: formData.password // Add password2 for backend compatibility
      };
      
      // The register function in AuthContext now handles all redirects
      await register(userData);
      
      // If we get here, registration was successful with no verification required
      // The user is already logged in and will be redirected to dashboard
      
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle network errors specifically
      if (err.message === 'Network Error') {
        setError('Network error: Unable to connect to the server. Please check your internet connection and try again.');
        console.error('Network error details:', {
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
          errorCode: err.code,
          errorMessage: err.message
        });
        return;
      }
      
      if (err.response?.data) {
        // Handle validation errors from the backend
        const serverErrors = err.response.data;
        let errorMessage = '';
        
        if (typeof serverErrors === 'object') {
          // Process object with error fields
          errorMessage = Object.entries(serverErrors)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        } else if (typeof serverErrors === 'string') {
          // Direct error message
          errorMessage = serverErrors;
        } else {
          // HTML response or other format
          errorMessage = 'Server error: ' + (err.response.status || 'Unknown error');
        }
        
        setError(errorMessage);
      } else if (err.message) {
        setError(`Registration failed: ${err.message}`);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[rgb(84,207,99)]">CBOE PITCH Data Processor</h1>
        <p className="text-gray-600 mt-2">Create a new account</p>
      </div>
      
      {error && !isLoading && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div className="mb-4">
            <label htmlFor="first_name" className="block text-gray-700 text-sm font-medium mb-2">
              First Name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)]"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="last_name" className="block text-gray-700 text-sm font-medium mb-2">
              Last Name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)]"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)]"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[rgb(84,207,99)] focus:border-[rgb(84,207,99)]"
              required
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
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isLoading ? 'bg-[rgba(84,207,99,0.6)] cursor-not-allowed' : 'bg-[rgb(84,207,99)] hover:bg-[rgb(76,186,89)]'
            }`}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-[rgb(84,207,99)] hover:text-[rgb(76,186,89)] font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
} 
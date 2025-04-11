'use client';

import { useState, useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  message: string;
  show: boolean;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function Notification({
  type,
  message,
  show,
  onClose,
  autoClose = true,
  duration = 5000
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(show);
  
  // Handle auto-close functionality
  useEffect(() => {
    setIsVisible(show);
    
    let timer: NodeJS.Timeout;
    if (show && autoClose) {
      timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [show, autoClose, duration, onClose]);
  
  // If notification is not visible, don't render anything
  if (!isVisible) return null;
  
  // Determine the appropriate styling based on the notification type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'info':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };
  
  return (
    <div className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 border-l-4 p-4 rounded shadow-md z-50 ${getTypeStyles()} animate-fadeIn`}>
      <div className="flex justify-between items-center">
        <p className="font-medium">{message}</p>
        <button 
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
} 
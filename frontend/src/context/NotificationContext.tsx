'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification, { NotificationType } from '@/components/Notification';

interface NotificationContextProps {
  showNotification: (type: NotificationType, message: string) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  showNotification: () => {},
  hideNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{
    type: NotificationType;
    message: string;
    show: boolean;
  }>({
    type: 'info',
    message: '',
    show: false,
  });

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({
      type,
      message,
      show: true,
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({
      ...prev,
      show: false,
    }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <Notification
        type={notification.type}
        message={notification.message}
        show={notification.show}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
}; 
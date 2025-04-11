import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CBOE PITCH Data Processor',
  description: 'Process and analyze CBOE PITCH market data files',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style>
          {`
            :root {
              --primary-color: #242a45;
              --secondary-color: #00a8e2;
              --accent-color: rgb(84,207,99);
              --accent-hover: rgb(70,180,85);
              --accent-color-light: rgba(84,207,99,0.1);
              --accent-color-dark: rgba(84,207,99,0.3);
              --text-primary: #242a45;
              --text-secondary: #6B7280;
              --bg-light: #f8f9fa;
              --bg-white: #ffffff;
            }
          `}
        </style>
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-gray-50">
                {children}
              </div>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
} 
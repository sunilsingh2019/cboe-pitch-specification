'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import axios from 'axios';

// Simple activity chart component
const ActivityChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  
  return (
    <div className="flex items-end h-16 space-x-1">
      {data.map((value, index) => (
        <div 
          key={index}
          className="bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-all duration-200 rounded-t w-full"
          style={{ 
            height: `${max ? (value / max) * 100 : 0}%`,
            minHeight: value > 0 ? '4px' : '0'
          }}
          title={`${value} messages`}
        />
      ))}
    </div>
  );
};

interface DashboardStats {
  totalFilesProcessed: number;
  totalMessages: number;
  uniqueSymbols: number;
  topMessageTypes: { type: string; count: number; percentage: string }[];
  recentSymbols: string[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<number[]>(Array(24).fill(0));
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  
  // Get API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        setLoading(true);
        const apiUrl = getApiUrl();
        
        try {
          // Get file list
          const filesResponse = await axios.get(`${apiUrl}/api/files/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });
          
          // Check if we have files
          if (filesResponse.data && filesResponse.data.length > 0) {
            setHasUploadedFiles(true);
            
            // Calculate statistics from the files data
            const files = filesResponse.data;
            
            // Calculate total message count across all files
            let totalMessages = 0;
            let uniqueSymbolsTotal = 0;
            
            for (const file of files) {
              totalMessages += file.total_lines || 0;
              uniqueSymbolsTotal += file.unique_symbols_count || 0;
            }
            
            // Get details for the most recent file to extract message types
            const mostRecentFileId = files[0].id;
            const fileDetailsResponse = await axios.get(`${apiUrl}/api/files/${mostRecentFileId}/`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
              }
            });
            
            // Get message counts and symbols from the file details
            const { message_counts: messageCounts, symbols } = fileDetailsResponse.data;
            
            // Format message types for display
            const messageTypes = Object.entries(messageCounts)
              .map(([type, count]: [string, any]) => ({
                type: type.toLowerCase().includes('unknown') ? 
                  type.replace(/unknown/i, 'Uncategorized') : type,
                count,
                percentage: ((count / totalMessages) * 100).toFixed(1)
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 4);
            
            // Create dashboard stats
            const dashboardStats: DashboardStats = {
              totalFilesProcessed: files.length,
              totalMessages: totalMessages,
              uniqueSymbols: uniqueSymbolsTotal,
              topMessageTypes: messageTypes,
              recentSymbols: symbols.slice(0, 5)
            };
            
            // Generate random activity data for now
            // In a real app, this would come from the API
            const randomActivity = Array(24).fill(0).map(() => Math.floor(Math.random() * 1000));
            
            setStats(dashboardStats);
            setActivity(randomActivity);
          } else {
            // No files found
            setHasUploadedFiles(false);
            setStats(null);
          }
        } catch (error) {
          console.error('Error fetching files:', error);
          setHasUploadedFiles(false);
          setStats(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setHasUploadedFiles(false);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-[var(--accent-color-light)] border border-[var(--accent-color-dark)] p-6 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Welcome to CBOE PITCH Data Processor</h2>
        <p className="mb-4">
          This application allows you to upload and process CBOE PITCH data files.
          You can analyze the distribution of message types in your data.
        </p>
        
        {user && (
          <p className="mb-4">
            Welcome back, {user.first_name || user.username}! Ready to process some PITCH data?
          </p>
        )}
        
        <Link 
          href="/dashboard/upload" 
          className="inline-block mt-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded transition-colors"
        >
          Upload PITCH File
        </Link>
      </div>
      
      {hasUploadedFiles && stats ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
              <h3 className="text-gray-500 text-sm uppercase mb-1">Files Processed</h3>
              <p className="text-3xl font-bold text-[var(--accent-color)]">{stats.totalFilesProcessed.toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
              <h3 className="text-gray-500 text-sm uppercase mb-1">Total Messages</h3>
              <p className="text-3xl font-bold text-[var(--accent-color)]">{stats.totalMessages.toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
              <h3 className="text-gray-500 text-sm uppercase mb-1">Unique Symbols</h3>
              <p className="text-3xl font-bold text-[var(--accent-color)]">{stats.uniqueSymbols.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Activity chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="font-semibold text-lg mb-4 text-[var(--accent-color)]">24-Hour Message Activity</h3>
            <ActivityChart data={activity} />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
          </div>
          
          {/* Message type breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-4 text-[var(--accent-color)]">Top Message Types</h3>
              <div className="space-y-4">
                {stats.topMessageTypes.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{item.type}</span>
                      <span className="text-gray-600">{item.count.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[var(--accent-color)] h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-4 text-[var(--accent-color)]">Recent Symbols</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {stats.recentSymbols.map((symbol, index) => (
                  <div 
                    key={index} 
                    className="bg-[var(--accent-color-light)] border border-[var(--accent-color-dark)] rounded p-3 text-center hover:bg-[var(--accent-color-light)] transition-colors cursor-pointer"
                  >
                    <span className="font-medium">{symbol}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-10 rounded-lg shadow text-center">
          <div className="text-[var(--accent-color)] mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No PITCH Data Available</h3>
          <p className="text-gray-600 mb-6">
            Upload a PITCH file to see statistics and analysis. Once processed, this dashboard will display detailed metrics.
          </p>
          <Link 
            href="/dashboard/upload" 
            className="inline-block bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Upload PITCH File
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Or check the <Link href="/dashboard/history" className="text-[var(--accent-color)] hover:underline">file history</Link> page to view previously processed files.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg mb-3 text-[var(--accent-color)]">Process Data</h3>
          <p className="text-gray-600 mb-4">
            Upload and analyze CBOE PITCH data files to see message type distributions and statistics.
          </p>
          <Link 
            href="/dashboard/upload" 
            className="inline-block text-[var(--accent-color)] hover:text-[var(--accent-hover)] font-medium"
          >
            Process PITCH Data →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg mb-3 text-[var(--accent-color)]">View File History</h3>
          <p className="text-gray-600 mb-4">
            Check previously uploaded PITCH files and review their analysis results.
          </p>
          <Link 
            href="/dashboard/history" 
            className="inline-block text-[var(--accent-color)] hover:text-[var(--accent-hover)] font-medium"
          >
            View History →
          </Link>
        </div>
      </div>
    </div>
  );
} 
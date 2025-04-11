'use client';

import { useState } from 'react';
import axios from 'axios';
import FileUpload from '@/components/FileUpload';
import MessageTable from '@/components/MessageTable';
import PitchSummary from '@/components/PitchSummary';

interface ApiResponse {
  message_counts?: Record<string, number>;
  summary?: {
    total_lines: number;
    unique_symbols: number;
    unique_order_ids: number;
    unique_execution_ids: number;
  };
  symbols?: string[];
}

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number> | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState<{
    startTime: number;
    endTime: number;
    fileSize: number;
  } | null>(null);
  
  // Get the API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // In browser environment, we need to use localhost instead of the Docker service name
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  const apiUrl = getApiUrl();
  
  const handleFileUpload = async (file: File) => {
    // Reset all state
    setIsLoading(true);
    setMessageCounts(null);
    setSummary(null);
    setSymbols([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadStartTime = performance.now();
    
    try {
      // Fix the URL to include /api/ if not already in the base URL
      const url = `${apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl}/api/upload/`;
      console.log('API URL:', url);
      
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const uploadEndTime = performance.now();
      
      const data = response.data as ApiResponse;
      console.log('File processing result:', data);
      
      if (data.message_counts) {
        setMessageCounts(data.message_counts);
      }
      
      if (data.summary) {
        setSummary(data.summary);
      }
      
      if (data.symbols) {
        setSymbols(data.symbols);
      }
      
      setSuccessMsg(`Successfully processed ${file.name}`);
      
      // Set processing stats
      setProcessingStats({
        startTime: uploadStartTime,
        endTime: uploadEndTime,
        fileSize: file.size
      });
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      if (error.response?.data?.detail) {
        setErrorMsg(error.response.data.detail);
      } else if (error.message) {
        setErrorMsg(`Error: ${error.message}`);
      } else {
        setErrorMsg('Failed to process file. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate processing metrics
  const getProcessingMetrics = () => {
    if (!processingStats) return null;
    
    const processingTime = (processingStats.endTime - processingStats.startTime) / 1000; // in seconds
    const fileSizeMB = processingStats.fileSize / (1024 * 1024);
    const processingSpeed = fileSizeMB / processingTime;
    
    return {
      time: processingTime.toFixed(2),
      size: fileSizeMB.toFixed(2),
      speed: processingSpeed.toFixed(2)
    };
  };
  
  const metrics = getProcessingMetrics();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">CBOE PITCH File Analysis</h1>
      <p className="text-gray-600 mb-6">Upload and analyze CBOE PITCH data files.</p>
      
      {errorMsg && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{errorMsg}</p>
        </div>
      )}
      
      {successMsg && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
          <p className="font-medium">{successMsg}</p>
          {metrics && (
            <div className="mt-2 text-sm">
              <p>Processed in {metrics.time}s • File size: {metrics.size} MB • Speed: {metrics.speed} MB/s</p>
            </div>
          )}
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-[var(--accent-color)]">Upload PITCH File</h2>
        <FileUpload onUpload={handleFileUpload} isLoading={isLoading} />
      </div>
      
      {summary && (
        <div className="mb-8 animate-fadeIn">
          <PitchSummary summary={summary} symbols={symbols} />
        </div>
      )}
      
      {messageCounts && Object.keys(messageCounts).length > 0 && (
        <div className="mb-8 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-[var(--accent-color)]">Message Type Counts</h2>
          <MessageTable messageCounts={messageCounts} />
        </div>
      )}
    </div>
  );
} 
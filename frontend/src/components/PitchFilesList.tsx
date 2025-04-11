'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import MessageDataTable from './MessageDataTable';

interface PitchFileData {
  id: number;
  file_name: string;
  uploaded_at: string;
  file_size: number;
  total_lines: number;
  unique_symbols_count: number;
  unique_order_ids_count: number;
  unique_execution_ids_count: number;
}

export default function PitchFilesList() {
  const [files, setFiles] = useState<PitchFileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<PitchFileData | null>(null);
  const [messageCounts, setMessageCounts] = useState<Record<string, number> | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedMessageType, setSelectedMessageType] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  
  // Get the API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // In browser environment, we need to use localhost instead of the Docker service name
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };
  
  const apiUrl = getApiUrl();
  
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = `${apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl}/api/files/`;
        console.log('Fetching files from:', url);
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        setFiles(response.data);
      } catch (err: any) {
        console.error('Error fetching pitch files:', err);
        setError('Failed to load previous files');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFiles();
  }, [apiUrl]);
  
  const fetchFileDetails = async (fileId: number) => {
    try {
      setLoading(true);
      setSelectedMessageType(null); // Reset selected message type when loading new file
      
      const url = `${apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl}/api/files/${fileId}/`;
      console.log('Fetching file details from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      setMessageCounts(response.data.message_counts);
      setSymbols(response.data.symbols || []);
    } catch (err: any) {
      console.error('Error fetching file details:', err);
      setError('Failed to load file details');
    } finally {
      setLoading(false);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const handleDelete = async (fileId: number) => {
    try {
      setDeleting(fileId);
      
      const url = `${apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl}/api/files/${fileId}/`;
      console.log('Deleting file with ID:', fileId);
      
      await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      // Remove the file from the state
      setFiles(files.filter(file => file.id !== fileId));
      setShowDeleteConfirm(null);
      
    } catch (err: any) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-[var(--accent-color)]">Previously Uploaded Files</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {loading && !selectedFile ? (
        <div className="mt-4">
          <p>Finding your files...</p>
        </div>
      ) : (
        <>
          {selectedFile ? (
            <div>
              <div className="flex items-center mb-4">
                <button 
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedMessageType(null);
                  }}
                  className="mr-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
                >
                  ← Back to list
                </button>
                <h3 className="text-lg font-medium">{selectedFile.file_name}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[rgba(84,207,99,0.1)] p-4 rounded-lg">
                  <p className="text-sm text-gray-600">File Size</p>
                  <p className="font-bold">{formatFileSize(selectedFile.file_size)}</p>
                </div>
                <div className="bg-[rgba(84,207,99,0.1)] p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Lines Processed</p>
                  <p className="font-bold">{selectedFile.total_lines.toLocaleString()}</p>
                </div>
                <div className="bg-[rgba(84,207,99,0.1)] p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Unique Symbols</p>
                  <p className="font-bold">{selectedFile.unique_symbols_count.toLocaleString()}</p>
                </div>
                <div className="bg-[rgba(84,207,99,0.1)] p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Unique Order IDs</p>
                  <p className="font-bold">{selectedFile.unique_order_ids_count.toLocaleString()}</p>
                </div>
              </div>
              
              {loading ? (
                <div className="mt-4">
                  <p>Loading details...</p>
                </div>
              ) : (
                <div>
                  {messageCounts && Object.keys(messageCounts).length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Message Type Distribution</h4>
                      <div className="bg-gray-50 p-4 rounded overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Message Type</th>
                              <th className="text-right py-2 px-4">Count</th>
                              <th className="text-right py-2 px-4">Percentage</th>
                              <th className="text-right py-2 px-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(messageCounts).map(([type, count]) => {
                              const percentage = (count / selectedFile.total_lines) * 100;
                              const displayType = type.toLowerCase().includes('unknown') ? 
                                type.replace(/unknown/i, 'Uncategorized') : type;
                              
                              return (
                                <tr key={type} className="border-b">
                                  <td className="py-2 px-4">{displayType}</td>
                                  <td className="text-right py-2 px-4">{count.toLocaleString()}</td>
                                  <td className="text-right py-2 px-4">{percentage.toFixed(2)}%</td>
                                  <td className="text-right py-2 px-4">
                                    <button
                                      onClick={() => setSelectedMessageType(type)}
                                      className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] text-sm font-medium"
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {symbols.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Sample Symbols</h4>
                      <div className="flex flex-wrap gap-2">
                        {symbols.map((symbol, index) => (
                          <div 
                            key={index}
                            className="bg-[rgba(84,207,99,0.1)] px-3 py-1 rounded text-gray-800 text-sm"
                          >
                            {symbol}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show message data table when a message type is selected */}
                  {selectedMessageType && selectedFile && (
                    <MessageDataTable 
                      fileId={selectedFile.id} 
                      messageType={selectedMessageType} 
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {files.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No files have been uploaded yet.</p>
                  <p className="mt-2">
                    <Link
                      href="/dashboard/upload"
                      className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] font-medium"
                    >
                      Upload a PITCH file
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">File Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Uploaded</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Lines</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Symbols</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr 
                          key={file.id} 
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">{file.file_name}</td>
                          <td className="py-3 px-4">{formatDate(file.uploaded_at)}</td>
                          <td className="py-3 px-4">{formatFileSize(file.file_size)}</td>
                          <td className="py-3 px-4">{file.total_lines.toLocaleString()}</td>
                          <td className="py-3 px-4">{file.unique_symbols_count.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-4">
                              <button 
                                onClick={() => {
                                  setSelectedFile(file);
                                  fetchFileDetails(file.id);
                                }}
                                className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] font-medium"
                              >
                                View Details
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(file.id)}
                                className="text-red-500 hover:text-red-700 font-medium"
                                disabled={deleting === file.id}
                              >
                                {deleting === file.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Confirm Delete</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                disabled={deleting !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                disabled={deleting !== null}
              >
                {deleting === showDeleteConfirm ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
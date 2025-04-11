'use client';

import { useState, useMemo } from 'react';

interface MessageTableProps {
  messageCounts: Record<string, number>;
}

export default function MessageTable({ messageCounts }: MessageTableProps) {
  const [sortBy, setSortBy] = useState<'type' | 'count'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  
  // Calculate total messages
  const totalMessages = useMemo(() => {
    return Object.values(messageCounts).reduce((sum, count) => sum + count, 0);
  }, [messageCounts]);
  
  // Check if type is likely a PITCH message type
  const isPitchMessageType = (type: string): boolean => {
    const pitchKeywords = [
      'add order', 'order', 'executed', 'cancel', 'trade', 'break', 
      'auction', 'symbol', 'status', 'retail'
    ];
    
    const lowercaseType = type.toLowerCase();
    return pitchKeywords.some(keyword => lowercaseType.includes(keyword));
  };
  
  // Format message type display names
  const formatMessageType = (type: string): string => {
    // Replace "unknown" with "uncategorized"
    if (type.toLowerCase().includes('unknown')) {
      return type.replace(/unknown/i, 'Uncategorized');
    }
    return type;
  };
  
  // Process and sort messages
  const sortedMessages = useMemo(() => {
    // Convert to array format for sorting and filtering
    let entries = Object.entries(messageCounts).map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalMessages) * 100,
      isPitch: isPitchMessageType(type)
    }));
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(entry => entry.type.toLowerCase().includes(query));
    }
    
    // Apply sorting
    entries.sort((a, b) => {
      // First, prioritize PITCH message types 
      if (a.isPitch && !b.isPitch) return -1;
      if (!a.isPitch && b.isPitch) return 1;
      
      // Then apply user-selected sorting
      if (sortBy === 'type') {
        return sortOrder === 'asc' 
          ? a.type.localeCompare(b.type) 
          : b.type.localeCompare(a.type);
      } else {
        return sortOrder === 'asc' 
          ? a.count - b.count 
          : b.count - a.count;
      }
    });
    
    return entries;
  }, [messageCounts, totalMessages, sortBy, sortOrder, searchQuery]);
  
  const handleSort = (column: 'type' | 'count') => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default order
      setSortBy(column);
      setSortOrder(column === 'type' ? 'asc' : 'desc');
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-[var(--accent-color)]">
            Message Distribution
          </h3>
          <div className="text-gray-500 text-sm bg-gray-100 px-2 py-1 rounded-full">
            {sortedMessages.length} types
          </div>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search message types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 pr-10 border rounded-lg text-sm w-full md:w-60 focus:outline-none focus:ring-2 focus:ring-[rgba(84,207,99,0.5)]"
          />
          <svg 
            className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className={`p-3 text-sm font-medium text-gray-700 cursor-pointer ${sortBy === 'type' ? 'bg-gray-100' : ''}`}
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center">
                  Message Type
                  <span className="ml-1">
                    {sortBy === 'type' && (
                      sortOrder === 'asc' ? '↑' : '↓'
                    )}
                  </span>
                </div>
              </th>
              <th 
                className={`p-3 text-sm font-medium text-gray-700 cursor-pointer ${sortBy === 'count' ? 'bg-gray-100' : ''}`}
                onClick={() => handleSort('count')}
              >
                <div className="flex items-center">
                  Count
                  <span className="ml-1">
                    {sortBy === 'count' && (
                      sortOrder === 'asc' ? '↑' : '↓'
                    )}
                  </span>
                </div>
              </th>
              <th className="p-3 text-sm font-medium text-gray-700">
                Percentage
              </th>
              <th className="p-3 text-sm font-medium text-gray-700">
                Distribution
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMessages.map(({ type, count, percentage, isPitch }) => (
              <tr 
                key={type} 
                className={`border-b hover:bg-gray-50 transition-colors ${
                  hoveredRow === type ? 'bg-[rgba(84,207,99,0.05)]' : ''
                } ${isPitch ? 'font-medium' : ''}`}
                onMouseEnter={() => setHoveredRow(type)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="p-3">
                  <div className="flex items-center">
                    {isPitch && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-color)] mr-2"></span>
                    )}
                    {formatMessageType(type)}
                    {hoveredRow === type && isPitch && (
                      <span className="ml-2 text-xs text-white bg-[var(--accent-color)] px-1.5 py-0.5 rounded">
                        PITCH
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{count.toLocaleString()}</td>
                <td className="p-3">{percentage.toFixed(2)}%</td>
                <td className="p-3 w-1/4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${isPitch ? 'bg-[var(--accent-color)]' : 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-medium">
            <tr>
              <td className="p-3">Total</td>
              <td className="p-3">{totalMessages.toLocaleString()}</td>
              <td className="p-3">100%</td>
              <td className="p-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full bg-[var(--accent-color)]" style={{ width: '100%' }}></div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

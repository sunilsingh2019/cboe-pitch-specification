'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface MessageData {
  id: number;
  message_type: string;
  timestamp: number;
  order_id: string;
  symbol: string;
  price: number;
  quantity: number;
  side?: string;
  executed_shares?: number;
  trade_id?: string;
  canceled_shares?: number;
  modified_shares?: number;
  auction_type?: string;
  reference_price?: number;
  event_code?: string;
}

interface MessageDataTableProps {
  fileId: number;
  messageType: string;
}

export default function MessageDataTable({ fileId, messageType }: MessageDataTableProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 25;

  // Get the API URL, replacing 'backend' with 'localhost' for browser access
  const getApiUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return configuredUrl.replace('http://backend:', 'http://localhost:');
  };

  const apiUrl = getApiUrl();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine the message type API endpoint based on provided type
        let endpoint = '';
        const cleanType = messageType.toLowerCase().replace(/[\s()]/g, '_');
        
        if (cleanType.includes('add_order')) {
          endpoint = 'add-orders';
        } else if (cleanType.includes('order_executed')) {
          endpoint = 'trades';
        } else if (cleanType.includes('order_cancel')) {
          endpoint = 'cancel-orders';
        } else if (cleanType.includes('trade')) {
          endpoint = 'trades';
        } else if (cleanType.includes('auction')) {
          endpoint = 'auctions';
        } else if (cleanType.includes('trading_status') || cleanType.includes('symbol_clear')) {
          endpoint = 'system-events';
        } else {
          // Default fallback
          setError('Unsupported message type for detailed view');
          setLoading(false);
          return;
        }
        
        const url = `${apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl}/api/files/${fileId}/${endpoint}/?page=${page}&limit=${itemsPerPage}`;
        console.log('Fetching message data from:', url);
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        if (response.data && Array.isArray(response.data.results)) {
          setMessages(prev => page === 1 ? response.data.results : [...prev, ...response.data.results]);
          setHasMore(!!response.data.next);
        } else {
          setMessages([]);
          setHasMore(false);
        }
      } catch (err: any) {
        console.error('Error fetching message data:', err);
        setError('Failed to load message details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [apiUrl, fileId, messageType, page]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    // Convert nanosecond timestamp to milliseconds for Date object
    const date = new Date(timestamp / 1000000);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(price);
  };

  // Render table columns based on message type
  const renderTableHeaders = () => {
    const commonHeaders = (
      <>
        <th className="text-left py-2 px-3 font-medium text-gray-600">Timestamp</th>
        <th className="text-left py-2 px-3 font-medium text-gray-600">Symbol</th>
        <th className="text-left py-2 px-3 font-medium text-gray-600">Order ID</th>
      </>
    );

    if (messageType.toLowerCase().includes('add_order')) {
      return (
        <tr className="bg-gray-50 border-b">
          {commonHeaders}
          <th className="text-left py-2 px-3 font-medium text-gray-600">Side</th>
          <th className="text-left py-2 px-3 font-medium text-gray-600">Price</th>
          <th className="text-left py-2 px-3 font-medium text-gray-600">Quantity</th>
        </tr>
      );
    } else if (messageType.toLowerCase().includes('trade')) {
      return (
        <tr className="bg-gray-50 border-b">
          {commonHeaders}
          <th className="text-left py-2 px-3 font-medium text-gray-600">Trade ID</th>
          <th className="text-left py-2 px-3 font-medium text-gray-600">Price</th>
          <th className="text-left py-2 px-3 font-medium text-gray-600">Executed Shares</th>
        </tr>
      );
    } else if (messageType.toLowerCase().includes('cancel')) {
      return (
        <tr className="bg-gray-50 border-b">
          {commonHeaders}
          <th className="text-left py-2 px-3 font-medium text-gray-600">Canceled Shares</th>
        </tr>
      );
    } else if (messageType.toLowerCase().includes('auction')) {
      return (
        <tr className="bg-gray-50 border-b">
          {commonHeaders}
          <th className="text-left py-2 px-3 font-medium text-gray-600">Auction Type</th>
          <th className="text-left py-2 px-3 font-medium text-gray-600">Reference Price</th>
        </tr>
      );
    } else {
      return (
        <tr className="bg-gray-50 border-b">
          {commonHeaders}
          <th className="text-left py-2 px-3 font-medium text-gray-600">Event Code</th>
        </tr>
      );
    }
  };

  // Render table rows based on message type
  const renderTableRows = () => {
    if (!messages.length) {
      return (
        <tr>
          <td colSpan={6} className="py-4 px-3 text-center text-gray-500">
            No data available for this message type
          </td>
        </tr>
      );
    }

    return messages.map((message, index) => {
      const commonCells = (
        <>
          <td className="py-2 px-3">{formatTimestamp(message.timestamp)}</td>
          <td className="py-2 px-3">{message.symbol || 'N/A'}</td>
          <td className="py-2 px-3">{message.order_id || 'N/A'}</td>
        </>
      );

      if (messageType.toLowerCase().includes('add_order')) {
        return (
          <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
            {commonCells}
            <td className="py-2 px-3">{message.side === 'B' ? 'Buy' : message.side === 'S' ? 'Sell' : 'N/A'}</td>
            <td className="py-2 px-3">{formatPrice(message.price)}</td>
            <td className="py-2 px-3">{message.quantity?.toLocaleString() || 'N/A'}</td>
          </tr>
        );
      } else if (messageType.toLowerCase().includes('trade')) {
        return (
          <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
            {commonCells}
            <td className="py-2 px-3">{message.trade_id || 'N/A'}</td>
            <td className="py-2 px-3">{formatPrice(message.price)}</td>
            <td className="py-2 px-3">{message.executed_shares?.toLocaleString() || message.quantity?.toLocaleString() || 'N/A'}</td>
          </tr>
        );
      } else if (messageType.toLowerCase().includes('cancel')) {
        return (
          <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
            {commonCells}
            <td className="py-2 px-3">{message.canceled_shares?.toLocaleString() || 'N/A'}</td>
          </tr>
        );
      } else if (messageType.toLowerCase().includes('auction')) {
        return (
          <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
            {commonCells}
            <td className="py-2 px-3">{message.auction_type || 'N/A'}</td>
            <td className="py-2 px-3">{formatPrice(message.reference_price)}</td>
          </tr>
        );
      } else {
        return (
          <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
            {commonCells}
            <td className="py-2 px-3">{message.event_code || 'N/A'}</td>
          </tr>
        );
      }
    });
  };

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white p-4 rounded-lg border">
      <h3 className="font-medium text-lg mb-3">{messageType} - Detailed View</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            {renderTableHeaders()}
          </thead>
          <tbody>
            {loading && !messages.length ? (
              <tr>
                <td colSpan={6} className="py-4 text-center">
                  <p>Loading message data...</p>
                </td>
              </tr>
            ) : (
              renderTableRows()
            )}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-[var(--accent-color-light)] hover:bg-[var(--accent-color)] hover:text-white text-[var(--accent-color)] rounded transition-colors font-medium disabled:opacity-50"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
} 
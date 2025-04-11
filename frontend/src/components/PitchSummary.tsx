'use client';

import { useState } from 'react';

interface SummaryData {
  total_lines: number;
  unique_symbols: number;
  unique_order_ids: number;
  unique_execution_ids: number;
}

interface PitchSummaryProps {
  summary: SummaryData;
  symbols?: string[];
}

// Mini donut chart component for visualization
const DonutChart = ({ percentage, color = 'var(--accent-color)' }: { percentage: number, color?: string }) => {
  // Calculate the stroke dash array and offset
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashArray = circumference;
  const dashOffset = circumference * (1 - percentage / 100);
  
  return (
    <div className="relative w-24 h-24 mx-auto">
      {/* Background circle */}
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          fill="transparent" 
          stroke="#f1f1f1" 
          strokeWidth="10" 
        />
        {/* Foreground circle */}
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          fill="transparent" 
          stroke={color} 
          strokeWidth="10" 
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{percentage}%</span>
      </div>
    </div>
  );
};

export default function PitchSummary({ summary, symbols = [] }: PitchSummaryProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'symbols'>('summary');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  
  // Calculate some percentages for visualizations
  const totalOrders = summary.unique_order_ids + summary.unique_execution_ids;
  const orderIdPercentage = totalOrders > 0 
    ? Math.round((summary.unique_order_ids / totalOrders) * 100) 
    : 0;
  
  const symbolUsageData = symbols.slice(0, 6).map((symbol) => ({
    symbol,
    usage: Math.floor(Math.random() * 100) // Mock data - in real app, get actual percentages
  }));
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <h2 className="text-xl font-semibold mb-4 text-[var(--accent-color)]">PITCH Data Summary</h2>
      
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'summary'
              ? 'border-b-2 border-[var(--accent-color)] text-[var(--accent-color)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Summary Statistics
        </button>
        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'symbols'
              ? 'border-b-2 border-[var(--accent-color)] text-[var(--accent-color)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Symbols ({symbols.length})
        </button>
      </div>
      
      {activeTab === 'summary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-gray-600 font-medium">Total Lines Processed</h3>
                <span className="text-sm text-gray-500">100%</span>
              </div>
              <div className="bg-[rgba(84,207,99,0.1)] rounded-lg p-4 hover:bg-[rgba(84,207,99,0.15)] transition-colors">
                <p className="text-2xl font-bold text-center">{summary.total_lines.toLocaleString()}</p>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-gray-600 font-medium">Unique Symbols</h3>
                <span className="text-sm text-gray-500">Found in data</span>
              </div>
              <div className="bg-[rgba(84,207,99,0.1)] rounded-lg p-4 hover:bg-[rgba(84,207,99,0.15)] transition-colors">
                <p className="text-2xl font-bold text-center">
                  {summary.unique_symbols.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-gray-600 font-medium mb-2">Order IDs vs Execution IDs</h3>
            <div className="bg-[rgba(84,207,99,0.1)] rounded-lg p-4 hover:bg-[rgba(84,207,99,0.15)] transition-colors">
              <div className="flex flex-col items-center mb-2">
                <DonutChart percentage={orderIdPercentage} />
                <p className="text-sm text-gray-500 mt-1">Order IDs ({orderIdPercentage}%)</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Order IDs</p>
                  <p className="font-bold">{summary.unique_order_ids.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Execution IDs</p>
                  <p className="font-bold">{summary.unique_execution_ids.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search symbols..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(84,207,99,0.5)] focus:border-[var(--accent-color)]"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {symbols.slice(0, 20).map((symbol, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-center cursor-pointer transition-all duration-200 ${
                  hoveredSymbol === symbol
                    ? 'bg-[var(--accent-color)] text-white transform scale-105'
                    : 'bg-[rgba(84,207,99,0.1)] hover:bg-[rgba(84,207,99,0.2)]'
                }`}
                onMouseEnter={() => setHoveredSymbol(symbol)}
                onMouseLeave={() => setHoveredSymbol(null)}
              >
                <span className="font-medium">{symbol}</span>
              </div>
            ))}
          </div>
          
          {symbols.length > 20 && (
            <div className="mt-4 text-center text-gray-500">
              <p>
                +{symbols.length - 20} more symbols found in data...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
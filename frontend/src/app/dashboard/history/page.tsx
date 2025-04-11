'use client';

import PitchFilesList from '@/components/PitchFilesList';

export default function HistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">PITCH File History</h1>
      <p className="text-gray-600 mb-6">View and analyze previously uploaded CBOE PITCH data files.</p>
      
      <PitchFilesList />
    </div>
  );
} 
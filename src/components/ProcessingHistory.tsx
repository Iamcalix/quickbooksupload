import React from 'react';
import { ParseResult } from '../utils/transactionParser';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  result: ParseResult;
}

interface ProcessingHistoryProps {
  history: HistoryEntry[];
  onRedownload: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

const ProcessingHistory: React.FC<ProcessingHistoryProps> = ({ 
  history, 
  onRedownload,
  onClearHistory 
}) => {
  if (history.length === 0) {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h2 className="text-lg font-bold text-white">Session History</h2>
            <p className="text-gray-300 text-sm">Last {history.length} imports (this session)</p>
          </div>
        </div>
        <button
          onClick={onClearHistory}
          className="text-gray-300 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>
      </div>

      {/* History List */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {history.map((entry) => {
          const successRate = entry.result.totalLines > 0 
            ? Math.round((entry.result.successCount / entry.result.totalLines) * 100) 
            : 0;
          
          return (
            <div 
              key={entry.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  successRate >= 80 ? 'bg-emerald-100' : successRate >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className={`text-lg font-bold ${
                    successRate >= 80 ? 'text-emerald-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {successRate}%
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {entry.result.successCount.toLocaleString()} transactions parsed
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(entry.timestamp)} • {entry.result.totalLines.toLocaleString()} total lines
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRedownload(entry)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Re-download
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

};

export default ProcessingHistory;

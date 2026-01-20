import React, { useState } from 'react';
import { ParsedTransaction } from '../utils/transactionParser';

interface FailedRecordsPanelProps {
  failedRecords: ParsedTransaction[];
}

const FailedRecordsPanel: React.FC<FailedRecordsPanelProps> = ({ failedRecords }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  if (failedRecords.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(failedRecords.length / itemsPerPage);
  const paginatedRecords = failedRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center justify-between hover:from-red-700 hover:to-red-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-white">Failed Records</h2>
            <p className="text-red-100 text-sm">{failedRecords.length} records could not be parsed</p>
          </div>
        </div>
        <svg 
          className={`w-6 h-6 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                These records didn't match the expected format. Review them below and ensure they follow the NMB statement format. 
                You can download these for manual review.
              </span>
            </p>
          </div>

          {/* Failed Records List */}
          <div className="space-y-3">
            {paginatedRecords.map((record, index) => (
              <div 
                key={index}
                className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Record #{(currentPage - 1) * itemsPerPage + index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                    {record.errorMessage || 'Parse Error'}
                  </span>
                </div>
                <div className="p-4">
                  <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-all bg-white p-3 rounded border border-gray-200 max-h-32 overflow-y-auto">
                    {record.rawLine}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, failedRecords.length)} of {failedRecords.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FailedRecordsPanel;

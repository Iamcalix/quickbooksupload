import React, { useState, useEffect, useCallback } from 'react';
import { 
  TransactionBatch, 
  getBatches, 
  getBatchTransactions, 
  deleteBatch, 
  updateBatchName,
  convertToExportFormat 
} from '../utils/databaseService';
import { downloadExcel, downloadCSV } from '../utils/excelExport';

interface CloudHistoryPanelProps {
  onRefresh?: () => void;
  refreshTrigger?: number;
}

const CloudHistoryPanel: React.FC<CloudHistoryPanelProps> = ({ onRefresh, refreshTrigger }) => {
  const [batches, setBatches] = useState<TransactionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | 'custom'>('all');
  const [minSuccessRate, setMinSuccessRate] = useState<number>(0);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    let startDate: Date | undefined;
    const now = new Date();

    if (dateFilter === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const { batches: fetchedBatches, error: fetchError } = await getBatches({
      startDate,
      minSuccessRate: minSuccessRate > 0 ? minSuccessRate : undefined
    });

    if (fetchError) {
      setError(fetchError);
    } else {
      setBatches(fetchedBatches);
    }
    setLoading(false);
  }, [dateFilter, minSuccessRate]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches, refreshTrigger]);

  const handleExport = async (batch: TransactionBatch, format: 'excel' | 'csv') => {
    setExporting(batch.id);
    
    const { transactions, error } = await getBatchTransactions(batch.id, true);
    
    if (error) {
      alert(`Error loading transactions: ${error}`);
      setExporting(null);
      return;
    }

    const exportData = convertToExportFormat(transactions);
    
    if (format === 'excel') {
      downloadExcel(exportData, `batch_${batch.batch_name || batch.id}`);
    } else {
      downloadCSV(exportData, `batch_${batch.batch_name || batch.id}`);
    }
    
    setExporting(null);
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    setDeleting(batchId);
    const { success, error } = await deleteBatch(batchId);
    
    if (error) {
      alert(`Error deleting batch: ${error}`);
    } else if (success) {
      setBatches(prev => prev.filter(b => b.id !== batchId));
    }
    
    setDeleting(null);
  };

  const handleRename = async (batchId: string) => {
    if (!editName.trim()) {
      setEditingBatch(null);
      return;
    }

    const { success, error } = await updateBatchName(batchId, editName.trim());
    
    if (error) {
      alert(`Error renaming batch: ${error}`);
    } else if (success) {
      setBatches(prev => prev.map(b => 
        b.id === batchId ? { ...b, batch_name: editName.trim() } : b
      ));
    }
    
    setEditingBatch(null);
    setEditName('');
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  };

  const getSuccessRate = (batch: TransactionBatch) => {
    return batch.total_lines > 0 
      ? Math.round((batch.success_count / batch.total_lines) * 100) 
      : 0;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cloud History</h2>
              <p className="text-indigo-200 text-sm">{batches.length} saved batches</p>
            </div>
          </div>
          <button
            onClick={loadBatches}
            disabled={loading}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <svg className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Time:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Min Success:</label>
            <select
              value={minSuccessRate}
              onChange={(e) => setMinSuccessRate(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={0}>Any</option>
              <option value={50}>50%+</option>
              <option value={75}>75%+</option>
              <option value={90}>90%+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {loading && batches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Loading saved batches...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={loadBatches}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Saved Batches</h3>
            <p className="text-gray-500 mt-1">Parse and save transactions to see them here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {batches.map((batch) => {
              const successRate = getSuccessRate(batch);
              const isExpanded = expandedBatch === batch.id;
              
              return (
                <div key={batch.id} className="hover:bg-gray-50 transition-colors">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          successRate >= 80 ? 'bg-emerald-100' : successRate >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          <span className={`text-lg font-bold ${
                            successRate >= 80 ? 'text-emerald-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {successRate}%
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingBatch === batch.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(batch.id);
                                  if (e.key === 'Escape') setEditingBatch(null);
                                }}
                                className="px-2 py-1 border border-indigo-500 rounded focus:ring-2 focus:ring-indigo-300 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRename(batch.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingBatch(null)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <p 
                              className="font-medium text-gray-800 truncate cursor-pointer hover:text-indigo-600"
                              onClick={() => {
                                setEditingBatch(batch.id);
                                setEditName(batch.batch_name || '');
                              }}
                              title="Click to rename"
                            >
                              {batch.batch_name || 'Unnamed Batch'}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {formatDate(batch.created_at)} • {batch.success_count.toLocaleString()} of {batch.total_lines.toLocaleString()} parsed
                          </p>
                          {batch.total_amount > 0 && (
                            <p className="text-sm font-medium text-emerald-600">
                              TZS {batch.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Show options"
                        >
                          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Actions */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleExport(batch, 'excel')}
                          disabled={exporting === batch.id}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {exporting === batch.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          Export Excel
                        </button>
                        <button
                          onClick={() => handleExport(batch, 'csv')}
                          disabled={exporting === batch.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Export CSV
                        </button>
                        <button
                          onClick={() => handleDelete(batch.id)}
                          disabled={deleting === batch.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 ml-auto"
                        >
                          {deleting === batch.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-indigo-50 border-t border-indigo-100">
        <p className="text-xs text-indigo-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Batches are synced to cloud and accessible from any device with the same browser
        </p>
      </div>
    </div>
  );
};

export default CloudHistoryPanel;

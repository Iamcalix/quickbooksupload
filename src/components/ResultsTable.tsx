import React, { useState, useMemo } from 'react';
import { ParsedTransaction } from '../utils/transactionParser';

interface ResultsTableProps {
  transactions: ParsedTransaction[];
  onEdit: (index: number, field: keyof ParsedTransaction, value: string) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ transactions, onEdit }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ParsedTransaction>('transactionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingCell, setEditingCell] = useState<{ row: number; field: keyof ParsedTransaction } | null>(null);
  const [editValue, setEditValue] = useState('');

  const itemsPerPage = 20;

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions];

    // Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.refId.toLowerCase().includes(term) ||
        t.userId.toLowerCase().includes(term) ||
        t.productName.toLowerCase().includes(term) ||
        t.amount.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = String(a[sortField] || '').toLowerCase();
      const bVal = String(b[sortField] || '').toLowerCase();
      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof ParsedTransaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startEdit = (rowIndex: number, field: keyof ParsedTransaction, currentValue: string) => {
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingCell) {
      const actualIndex = transactions.findIndex(t => t === paginatedData[editingCell.row]);
      if (actualIndex !== -1) {
        onEdit(actualIndex, editingCell.field, editValue);
      }
    }
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const columns: { key: keyof ParsedTransaction; label: string; width: string }[] = [
    { key: 'clientName', label: 'Client Name', width: 'min-w-[200px]' },
    { key: 'memberId', label: 'Member ID', width: 'min-w-[150px]' },
    { key: 'refId', label: 'Ref Id', width: 'min-w-[120px]' },
    { key: 'userId', label: 'User Id', width: 'min-w-[150px]' },
    { key: 'emailAddress', label: 'Email Address', width: 'min-w-[200px]' },
    { key: 'productType', label: 'Product Type', width: 'min-w-[120px]' },
    { key: 'productName', label: 'Product Name', width: 'min-w-[150px]' },
    { key: 'accountNumber', label: 'AccountNumber', width: 'min-w-[150px]' },
    { key: 'amount', label: 'Amount', width: 'min-w-[120px]' },
    { key: 'type', label: 'Type', width: 'min-w-[100px]' },
    { key: 'principal', label: 'Principal', width: 'min-w-[120px]' },
    { key: 'interest', label: 'Interest', width: 'min-w-[100px]' },
    { key: 'charges', label: 'Charges', width: 'min-w-[100px]' },
    { key: 'chargeName', label: 'Charge Name', width: 'min-w-[150px]' },
    { key: 'transactionDate', label: 'Transaction Date', width: 'min-w-[150px]' },
    { key: 'operationType', label: 'Operation Type', width: 'min-w-[150px]' },
    { key: 'transactionMode', label: 'Transaction Mode', width: 'min-w-[150px]' },
    { key: 'transactionReferenceNumber', label: 'Trans Ref No.', width: 'min-w-[150px]' },
    { key: 'receiptNumber', label: 'Receipt No.', width: 'min-w-[120px]' },
    { key: 'chequeNumber', label: 'Cheque No.', width: 'min-w-[120px]' },
    { key: 'comment', label: 'Comment', width: 'min-w-[200px]' },
  ];

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700">No Data Yet</h3>
        <p className="text-gray-500 mt-1">Parse your transaction data to see results here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Parsed Results
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {filteredAndSorted.length} of {transactions.length} transactions
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 w-64"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${col.width}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortField === col.key && (
                      <svg className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((transaction, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-blue-50/50 transition-colors">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${col.width}`}
                    onDoubleClick={() => startEdit(rowIndex, col.key, String(transaction[col.key] || ''))}
                  >
                    {editingCell?.row === rowIndex && editingCell?.field === col.key ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                        autoFocus
                      />
                    ) : (
                      <span className={`${col.key === 'type'
                        ? transaction.type === 'Credit'
                          ? 'text-emerald-600 font-medium'
                          : 'text-red-600 font-medium'
                        : col.key === 'amount'
                          ? 'font-mono font-medium text-gray-800'
                          : 'text-gray-700'
                        }`}>
                        {col.key === 'amount' && transaction.amount ? `TZS ${transaction.amount}` : transaction[col.key] || '-'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>

            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
        <p className="text-xs text-blue-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Double-click any cell to edit its value
        </p>
      </div>
    </div>
  );
};

export default ResultsTable;

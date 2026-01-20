import React, { useState, useCallback, useEffect } from 'react';
import DataInputSection from './DataInputSection';
import ResultsTable from './ResultsTable';
import StatsPanel from './StatsPanel';
import FailedRecordsPanel from './FailedRecordsPanel';
import ProcessingHistory, { HistoryEntry } from './ProcessingHistory';
import CloudHistoryPanel from './CloudHistoryPanel';
import { parseTransactions, ParseResult, ParsedTransaction } from '../utils/transactionParser';
import { downloadExcel, downloadCSV, downloadFailedRecords } from '../utils/excelExport';
import { saveBatchToDatabase, getSessionId, fetchCustomerMappings, CustomerMapping } from '../utils/databaseService';

const AppLayout: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cloudRefreshTrigger, setCloudRefreshTrigger] = useState(0);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [customerMappings, setCustomerMappings] = useState<CustomerMapping[]>([]);

  useEffect(() => {
    // Fetch mappings on load
    const loadMappings = async () => {
      const mappings = await fetchCustomerMappings();
      setCustomerMappings(mappings);
    };
    loadMappings();
  }, []);

  const handleDataSubmit = useCallback(async (data: string, bankType: 'NMB' | 'CRDB' = 'NMB') => {
    setIsProcessing(true);
    setSaveMessage(null);

    // Simulate processing delay for large datasets
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = parseTransactions(data, bankType);

    // Apply customer mappings
    // Apply customer mappings
    if (customerMappings.length > 0) {
      console.log(`Processing with ${customerMappings.length} mappings`);
      result.successful = result.successful.map(t => {
        const mapping = customerMappings.find(m => {
          // Check Member ID matches
          if (m.member_id && m.member_id === t.userId) return true;
          // Check Ref ID matches
          if (m.ref_id && m.ref_id === t.refId) return true;
          // Check Account Number matches User ID or Ref ID (sometimes account number is in Ref/Desc)
          if (m.account_number && (m.account_number === t.userId || m.account_number === t.refId)) {
            console.log('Match found by Account Number:', m.account_number);
            return true;
          }
          return false;
        });

        if (mapping) {
          return {
            ...t,
            clientName: mapping.customer_name || '',
            memberId: mapping.member_id || '',
            emailAddress: mapping.email || t.emailAddress,
            accountNumber: mapping.account_number || t.accountNumber || (mapping.member_id === t.userId ? t.userId : ''),
            productName: mapping.loan_product || t.productName,
            comment: mapping.customer_name ? `Mapped to ${mapping.customer_name}` : t.comment
          };
        }
        return t;
      });
    }

    setParseResult(result);
    setTransactions(result.successful);

    // Add to local history (keep last 10)
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      result: result
    };
    setHistory(prev => [newEntry, ...prev.slice(0, 9)]);

    setIsProcessing(false);
  }, [customerMappings]);

  const handleSaveToCloud = useCallback(async () => {
    if (!parseResult || parseResult.successCount === 0) {
      setSaveMessage({ type: 'error', text: 'No transactions to save' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const batchName = `Batch ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const { batchId, error } = await saveBatchToDatabase(parseResult, batchName);

    if (error) {
      setSaveMessage({ type: 'error', text: `Failed to save: ${error}` });
    } else if (batchId) {
      setSaveMessage({ type: 'success', text: 'Transactions saved to cloud successfully!' });
      setCloudRefreshTrigger(prev => prev + 1);
    }

    setIsSaving(false);

    // Clear message after 5 seconds
    setTimeout(() => setSaveMessage(null), 5000);
  }, [parseResult]);

  const handleEditTransaction = useCallback((index: number, field: keyof ParsedTransaction, value: string) => {
    setTransactions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleDownloadExcel = useCallback(() => {
    if (transactions.length > 0) {
      downloadExcel(transactions, 'nmb_transactions');
    }
  }, [transactions]);

  const handleDownloadCSV = useCallback(() => {
    if (transactions.length > 0) {
      downloadCSV(transactions, 'nmb_transactions');
    }
  }, [transactions]);

  const handleDownloadFailed = useCallback(() => {
    if (parseResult && parseResult.failed.length > 0) {
      downloadFailedRecords(parseResult.failed, 'failed_records');
    }
  }, [parseResult]);

  const handleRedownload = useCallback((entry: HistoryEntry) => {
    downloadExcel(entry.result.successful, 'nmb_transactions_history');
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const sessionId = getSessionId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  NMB Transaction Parser
                </h1>
                <p className="text-blue-200 text-sm sm:text-base mt-1">
                  Transform bank statements into structured Excel reports
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm backdrop-blur-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="text-xs">Cloud Sync</span>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm backdrop-blur-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${customerMappings.length > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className="text-xs">Mappings: {customerMappings.length}</span>
              </div>
              <span className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm font-medium backdrop-blur-sm">
                v2.1
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-blue-800 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">Lightning Fast</h3>
              <p className="text-blue-200 text-sm mt-2">Process thousands of transactions in seconds</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">Smart Extraction</h3>
              <p className="text-blue-200 text-sm mt-2">Auto-extract Ref ID, amounts & dates</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">Excel Export</h3>
              <p className="text-blue-200 text-sm mt-2">Download clean, formatted reports</p>
            </div>

            {/* Feature 4 - NEW */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">Cloud Storage</h3>
              <p className="text-blue-200 text-sm mt-2">Save & access from any device</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-8">
            <DataInputSection
              onDataSubmit={handleDataSubmit}
              isProcessing={isProcessing}
            />

            {/* How It Works */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How It Works
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">1</div>
                  <div>
                    <p className="font-medium text-gray-800">Paste or Upload Data</p>
                    <p className="text-sm text-gray-500">Copy your NMB bank statement and paste it in the input area</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">2</div>
                  <div>
                    <p className="font-medium text-gray-800">Parse Transactions</p>
                    <p className="text-sm text-gray-500">Click "Parse Transactions" to extract all data fields</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">3</div>
                  <div>
                    <p className="font-medium text-gray-800">Review & Edit</p>
                    <p className="text-sm text-gray-500">Double-click any cell to edit values before exporting</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold">4</div>
                  <div>
                    <p className="font-medium text-gray-800">Save to Cloud</p>
                    <p className="text-sm text-gray-500">Save batches to cloud for access from any device</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold">5</div>
                  <div>
                    <p className="font-medium text-gray-800">Download Excel</p>
                    <p className="text-sm text-gray-500">Export your clean, structured data to Excel or CSV</p>
                  </div>
                </div>
              </div>
            </div>

            {/* History Tabs */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('local')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'local'
                    ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Session History
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('cloud')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'cloud'
                    ? 'bg-gray-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    Cloud History
                  </div>
                </button>
              </div>

              <div className="p-0">
                {activeTab === 'local' ? (
                  history.length > 0 ? (
                    <ProcessingHistory
                      history={history}
                      onRedownload={handleRedownload}
                      onClearHistory={handleClearHistory}
                    />
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">No Session History</h3>
                      <p className="text-gray-500 mt-1">Parse transactions to see history here</p>
                    </div>
                  )
                ) : (
                  <CloudHistoryPanel refreshTrigger={cloudRefreshTrigger} />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-8">
            {/* Save to Cloud Button */}
            {parseResult && parseResult.successCount > 0 && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Save to Cloud</h3>
                      <p className="text-indigo-200 text-sm">
                        {parseResult.successCount} transactions ready to save
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveToCloud}
                    disabled={isSaving}
                    className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Save Now
                      </>
                    )}
                  </button>
                </div>

                {/* Save Message */}
                {saveMessage && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${saveMessage.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}>
                    {saveMessage.type === 'success' ? (
                      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className={saveMessage.type === 'success' ? 'text-emerald-100' : 'text-red-100'}>
                      {saveMessage.text}
                    </span>
                  </div>
                )}
              </div>
            )}

            <StatsPanel
              result={parseResult}
              onDownloadExcel={handleDownloadExcel}
              onDownloadCSV={handleDownloadCSV}
              onDownloadFailed={handleDownloadFailed}
            />

            <FailedRecordsPanel
              failedRecords={parseResult?.failed || []}
            />
          </div>
        </div>

        {/* Results Table - Full Width */}
        <div className="mt-8">
          <ResultsTable
            transactions={transactions}
            onEdit={handleEditTransaction}
          />
        </div>

        {/* Expected Format Guide */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Expected Data Format
          </h3>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
              {`14  Jan 2026	14  Jan 2026		101 - NMB Head Office - Cash Deposit Agency banking - 1401 12 19 37 agency @20710095898@TPS900 Trx ID PS2076699419  Ter ID 2075149572   Description 111111111!! From SAVCOM LIMITED COLLECTION ACC => MISHONI NDULENYA NZIGE	101AGD126014A7BL	5000		TZS 1169000.00`}
            </pre>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-600 uppercase">Ref ID</p>
              <p className="text-sm text-gray-700 mt-1">Extracted from "Description XXXXXXX"</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-600 uppercase">User ID</p>
              <p className="text-sm text-gray-700 mt-1">Account number after @ symbol</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-600 uppercase">Amount</p>
              <p className="text-sm text-gray-700 mt-1">Deposited amount before TZS balance</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-600 uppercase">Date</p>
              <p className="text-sm text-gray-700 mt-1">Transaction date (DD Mon YYYY)</p>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="mt-8 bg-gray-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Session ID</p>
              <p className="text-xs text-gray-500 font-mono">{sessionId.substring(0, 30)}...</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Your data is linked to this browser session
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">NMB Transaction Parser</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                A powerful tool designed to transform NMB bank statement data into clean, structured Excel reports.
                Now with cloud storage for seamless access across devices.
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bulk Data Processing
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Smart Field Extraction
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Excel & CSV Export
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cloud Storage & Sync
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-4">Output Columns</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Ref Id</li>
                <li>User Id</li>
                <li>Product Type</li>
                <li>Product Name</li>
                <li>Amount</li>
                <li>Type</li>
                <li>Transaction Date</li>
                <li>Operation Type</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2026 NMB Transaction Parser. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 text-sm">Built for NMB Bank Statement Processing</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;

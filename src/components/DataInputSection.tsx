import React, { useState, useRef } from 'react';

interface DataInputSectionProps {
  onDataSubmit: (data: string, bankType: 'NMB' | 'CRDB') => void;
  isProcessing: boolean;
}

const DataInputSection: React.FC<DataInputSectionProps> = ({ onDataSubmit, isProcessing }) => {
  const [inputData, setInputData] = useState('');
  const [bankType, setBankType] = useState<'NMB' | 'CRDB'>('NMB');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleData = `14  Jan 2026	14  Jan 2026		101 - NMB Head Office - Cash Deposit Agency banking - 1401 12 19 37 agency @20710095898@TPS900 Trx ID PS2076699419  Ter ID 2075149572   Description 111111111!! From SAVCOM LIMITED COLLECTION ACC => MISHONI NDULENYA NZIGE	101AGD126014A7BL	5000		TZS 1169000.00
15  Jan 2026	15  Jan 2026		102 - NMB Dar es Salaam - Cash Deposit Agency banking - 1402 15 22 41 agency @20810095899@TPS901 Trx ID PS2076699420  Ter ID 2075149573   Description 222222222!! From KARIAKOO TRADERS ACC => JOHN MWAMBA PETER	102AGD126015B8CM	7500		TZS 1176500.00
15  Jan 2026	15  Jan 2026		103 - NMB Arusha Branch - Cash Deposit Agency banking - 1403 18 25 44 agency @20910095900@TPS902 Trx ID PS2076699421  Ter ID 2075149574   Description 333333333!! From KILIMANJARO COOP ACC => AMINA HASSAN JUMA	103AGD126015C9DN	12000		TZS 1188500.00
16  Jan 2026	16  Jan 2026		104 - NMB Mwanza Office - Cash Deposit Agency banking - 1404 21 28 47 agency @21010095901@TPS903 Trx ID PS2076699422  Ter ID 2075149575   Description 444444444!! From LAKE ZONE SUPPLIERS ACC => PETER JOHN MAKUNDI	104AGD126016D0EP	3500		TZS 1192000.00
16  Jan 2026	16  Jan 2026		105 - NMB Dodoma Central - Cash Deposit Agency banking - 1405 24 31 50 agency @21110095902@TPS904 Trx ID PS2076699423  Ter ID 2075149576   Description 555555555!! From CENTRAL MARKET TRADERS => FATUMA ALI MOHAMED	105AGD126016E1FQ	9000		TZS 1201000.00`;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputData(text);
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const loadSampleData = () => {
    setInputData(sampleData);
  };

  const clearData = () => {
    setInputData('');
  };

  const handleSubmit = () => {
    if (inputData.trim()) {
      onDataSubmit(inputData, bankType);
    }
  };

  const lineCount = inputData.split('\n').filter(l => l.trim()).length;
  const charCount = inputData.length;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Input Transaction Data
        </h2>
        <p className="text-blue-100 text-sm mt-1">Paste your NMB bank statement data or upload a file</p>
      </div>

      <div className="bg-blue-50/50 px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Bank Type:</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bankType"
                value="NMB"
                checked={bankType === 'NMB'}
                onChange={() => setBankType('NMB')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">NMB</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bankType"
                value="CRDB"
                checked={bankType === 'CRDB'}
                onChange={() => setBankType('CRDB')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">CRDB</span>
            </label>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.tsv"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="space-y-3">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors ${dragActive ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
              <svg className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                {dragActive ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-gray-500 text-sm mt-1">or</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Files
            </button>
            <p className="text-xs text-gray-400">Supports .txt, .csv, .tsv files</p>
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Or paste your transaction data directly:
          </label>
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="Paste your NMB bank statement data here...&#10;&#10;Example format:&#10;14  Jan 2026	14  Jan 2026		101 - NMB Head Office - Cash Deposit Agency banking..."
            className="w-full h-64 p-4 border border-gray-300 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
            spellCheck={false}
          />

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-sm text-gray-500 px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                {lineCount.toLocaleString()} lines
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {charCount.toLocaleString()} characters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSampleData}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Load Sample
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearData}
                className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={!inputData.trim() || isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${inputData.trim() && !isProcessing
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Parse Transactions
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DataInputSection;

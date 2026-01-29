// Transaction Parser Utility for NMB Bank Statements
import { CustomerMapping, extractMemberIdFromDescription, findCustomerByMemberId } from './customerMappingService';

// QuickBooks-compatible transaction format
export interface ParsedTransaction {
  paymentDate: string;           // Transaction date
  customer: string;               // Client name
  paymentMethod: string;          // Cash, Transfer, etc.
  depositToAccountName: string;   // Account where money is deposited
  invoiceNo: string;              // Reference/Transaction ID
  journalNo: string;              // Journal entry number
  amount: string;                 // Transaction amount
  referenceMemo: string;          // Additional reference information
  countryCode: string;            // Country code (e.g., "TZ" for Tanzania)
  exchangeRate: string;           // Exchange rate (default "1" or empty)
  rawLine: string;                // Original line for debugging
  isValid: boolean;               // Whether parsing was successful
  errorMessage?: string;          // Error message if parsing failed
}

export interface ParseResult {
  successful: ParsedTransaction[];
  failed: ParsedTransaction[];
  totalLines: number;
  successCount: number;
  failCount: number;
  bankType: 'NMB' | 'CRDB';
}

export function parseTransactionLine(line: string): ParsedTransaction {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return {
      paymentDate: '',
      customer: '',
      paymentMethod: '',
      depositToAccountName: '',
      invoiceNo: '',
      journalNo: '',
      amount: '',
      referenceMemo: '',
      countryCode: '',
      exchangeRate: '',
      rawLine: line,
      isValid: false,
      errorMessage: 'Empty line'
    };
  }

  try {
    // Extract date - pattern like "14  Jan 2026" or "14 Jan 2026"
    const datePattern = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/;
    const dateMatch = trimmedLine.match(datePattern);
    const paymentDate = dateMatch ? dateMatch[1].replace(/\s+/g, ' ').trim() : '';

    // Extract Description reference ID - pattern like "Description 111111111" or "Description 111111111!!"
    const descriptionPattern = /Description\s+(\d+)/i;
    const descriptionMatch = trimmedLine.match(descriptionPattern);
    const invoiceNo = descriptionMatch ? descriptionMatch[1] : '';

    // Extract User ID - pattern like "@20710095898@" or account number
    const userIdPattern = /@(\d+)@/;
    const userIdMatch = trimmedLine.match(userIdPattern);
    let userId = userIdMatch ? userIdMatch[1] : '';

    // Alternative: Extract from "=> NAME" pattern for user name
    const userNamePattern = /=>\s*([A-Z\s]+?)(?:\t|$)/i;
    const userNameMatch = trimmedLine.match(userNamePattern);
    const userName = userNameMatch ? userNameMatch[1].trim() : '';

    if (!userId && userName) {
      userId = userName;
    }

    // Extract amount - look for standalone number before TZS balance
    const amountPattern = /\t(\d+(?:,\d{3})*(?:\.\d{2})?)\t+(?:TZS|$)/i;
    const amountMatch = trimmedLine.match(amountPattern);
    let amount = amountMatch ? amountMatch[1] : '';

    // Alternative amount pattern - number before TZS balance
    if (!amount) {
      const altAmountPattern = /\t(\d+(?:,\d{3})*(?:\.\d{2})?)\s*\t*\s*TZS/i;
      const altMatch = trimmedLine.match(altAmountPattern);
      amount = altMatch ? altMatch[1] : '';
    }

    // If still no amount, try to find deposited amount in description
    if (!amount) {
      const depositPattern = /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:\t|TZS)/;
      const depositMatch = trimmedLine.match(depositPattern);
      if (depositMatch) {
        amount = depositMatch[1];
      }
    }

    // Determine payment method from description
    let paymentMethod = 'Cash';
    if (trimmedLine.toLowerCase().includes('transfer')) {
      paymentMethod = 'Transfer';
    } else if (trimmedLine.toLowerCase().includes('mobile')) {
      paymentMethod = 'Mobile Banking';
    } else if (trimmedLine.toLowerCase().includes('atm')) {
      paymentMethod = 'ATM';
    } else if (trimmedLine.toLowerCase().includes('cheque')) {
      paymentMethod = 'Cheque';
    }

    // Extract Product Name/Branch - usually the branch/office name
    const productNamePattern = /\d{3}\s*-\s*([^-]+)\s*-/;
    const productNameMatch = trimmedLine.match(productNamePattern);
    const depositToAccountName = productNameMatch ? productNameMatch[1].trim() : 'NMB Collection AC';

    // Customer name - will be populated from database mapping
    const customer = userName || '';

    // Reference memo - combine user ID and description snippet
    const referenceMemo = userId ? `${userId}` : invoiceNo;

    const isValid = !!(invoiceNo || amount || paymentDate);

    return {
      paymentDate,
      customer,
      paymentMethod,
      depositToAccountName,
      invoiceNo,
      journalNo: '', // Can be auto-generated or left empty
      amount,
      referenceMemo,
      countryCode: '', // Will be set to empty or "TZ" based on configuration
      exchangeRate: '', // Will be set to empty or "1" based on configuration
      rawLine: trimmedLine,
      isValid,
      errorMessage: isValid ? undefined : 'Could not extract required fields'
    };
  } catch (error) {
    return {
      paymentDate: '',
      customer: '',
      paymentMethod: '',
      depositToAccountName: '',
      invoiceNo: '',
      journalNo: '',
      amount: '',
      referenceMemo: '',
      countryCode: '',
      exchangeRate: '',
      rawLine: trimmedLine,
      isValid: false,
      errorMessage: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function parseCRDBTransactionLine(line: string): ParsedTransaction {
  const trimmedLine = line.trim();
  if (!trimmedLine) return createEmptyTransaction(line, 'Empty line');

  try {
    // CRDB Format: Date Time REF Description Date Time Amount1 Amount2 Balance
    // Example: 19.01.2026 22:40:00 REF:... 12,500.00 595,288,508.22

    // 1. Extract Date (First date occurrence)
    const datePattern = /(\d{2}\.\d{2}\.\d{4})/;
    const dateMatch = trimmedLine.match(datePattern);
    const paymentDate = dateMatch ? dateMatch[1].replace(/\./g, '/') : ''; // Convert to DD/MM/YYYY

    // 2. Extract Amounts
    const amountsRegex = /([\d,]+\.\d{2})/g;
    const allAmounts = [...trimmedLine.matchAll(amountsRegex)].map(m => m[1]);

    let amount = '';
    if (allAmounts.length >= 2) {
      if (allAmounts.length >= 3) {
        amount = allAmounts[allAmounts.length - 2];
      } else {
        amount = allAmounts[allAmounts.length - 1];
      }
    } else if (allAmounts.length === 1) {
      amount = allAmounts[0];
    }

    // 3. Extract Account Number
    const accountPattern = /:(\d{10,14})\s+/;
    const accountMatch = trimmedLine.match(accountPattern);
    const accountNumber = accountMatch ? accountMatch[1] : '';

    // 4. Extract Ref ID
    const refPattern = /REF:([a-zA-Z0-9]+)/;
    const refMatch = trimmedLine.match(refPattern);
    const invoiceNo = refMatch ? refMatch[1] : '';

    // 5. Extract Client Name
    const namePattern = /:([a-zA-Z\s]+):(?=\d{10,14})/;
    const nameMatch = trimmedLine.match(namePattern);
    const customer = nameMatch ? nameMatch[1].trim() : '';

    const isValid = !!(amount || paymentDate);

    return {
      paymentDate,
      customer,
      paymentMethod: 'Transfer',
      depositToAccountName: 'CRDB Collection AC',
      invoiceNo,
      journalNo: '',
      amount,
      referenceMemo: accountNumber || invoiceNo,
      countryCode: '',
      exchangeRate: '',
      rawLine: trimmedLine,
      isValid,
      errorMessage: isValid ? undefined : 'Could not extract required fields from CRDB line'
    };

  } catch (error) {
    return createEmptyTransaction(line, `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createEmptyTransaction(line: string, errorMessage?: string): ParsedTransaction {
  return {
    paymentDate: '',
    customer: '',
    paymentMethod: '',
    depositToAccountName: '',
    invoiceNo: '',
    journalNo: '',
    amount: '',
    referenceMemo: '',
    countryCode: '',
    exchangeRate: '',
    rawLine: line,
    isValid: false,
    errorMessage
  };
}

export function parseTransactions(
  rawData: string,
  bankType: 'NMB' | 'CRDB' = 'NMB',
  customerMappings: CustomerMapping[] = []
): ParseResult {
  const lines = rawData.split('\n').filter(line => line.trim());
  const successful: ParsedTransaction[] = [];
  const failed: ParsedTransaction[] = [];

  for (const line of lines) {
    const parsed = bankType === 'CRDB' ? parseCRDBTransactionLine(line) : parseTransactionLine(line);

    // Enrich with customer name if mapping is available
    if (parsed.isValid && customerMappings.length > 0) {
      // Extract Member ID from the raw line or reference memo
      const memberId = extractMemberIdFromDescription(parsed.rawLine);
      if (memberId) {
        const customerName = findCustomerByMemberId(memberId, customerMappings);
        if (customerName) {
          parsed.customer = customerName;
        }
      }
    }

    if (parsed.isValid) {
      successful.push(parsed);
    } else if (line.trim()) {
      failed.push(parsed);
    }
  }

  return {
    successful,
    failed,
    totalLines: lines.length,
    successCount: successful.length,
    failCount: failed.length,
    bankType
  };
}

export function generateExcelData(transactions: ParsedTransaction[]): any[][] {
  const headers = [
    'Payment Date',
    'Customer',
    'Payment Method',
    'Deposit To Account Name',
    'Invoice No',
    'Journal No',
    'Amount',
    'Reference Memo',
    'Country Code',
    'Exchange Rate'
  ];

  const rows = transactions.map(t => [
    t.paymentDate,
    t.customer,
    t.paymentMethod,
    t.depositToAccountName,
    t.invoiceNo,
    t.journalNo,
    t.amount,
    t.referenceMemo,
    t.countryCode,
    t.exchangeRate
  ]);

  return [headers, ...rows];
}

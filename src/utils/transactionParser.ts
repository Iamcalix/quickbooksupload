// Transaction Parser Utility for NMB Bank Statements

export interface ParsedTransaction {
  clientName: string;
  memberId: string;
  refId: string;
  userId: string;
  emailAddress: string;
  productType: string;
  productName: string;
  accountNumber: string;
  amount: string;
  type: string;
  principal: string;
  interest: string;
  charges: string;
  chargeName: string;
  transactionDate: string;
  operationType: string;
  transactionMode: string;
  transactionReferenceNumber: string;
  receiptNumber: string;
  chequeNumber: string;
  comment: string;
  rawLine: string;
  isValid: boolean;
  errorMessage?: string;
  nationalId?: string;
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
      clientName: '',
      memberId: '',
      refId: '',
      userId: '',
      emailAddress: '',
      productType: '',
      productName: '',
      accountNumber: '',
      amount: '',
      type: '',
      principal: '',
      interest: '',
      charges: '',
      chargeName: '',
      transactionDate: '',
      operationType: '',
      transactionMode: '',
      transactionReferenceNumber: '',
      receiptNumber: '',
      chequeNumber: '',
      comment: '',
      rawLine: line,
      isValid: false,
      errorMessage: 'Empty line'
    };
  }

  try {
    // Extract date - pattern like "14  Jan 2026" or "14 Jan 2026"
    const datePattern = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/;
    const dateMatch = trimmedLine.match(datePattern);
    const transactionDate = dateMatch ? dateMatch[1].replace(/\s+/g, ' ').trim() : '';

    // Extract Description reference ID - pattern like "Description 111111111" or "Description 111111111!!"
    const descriptionPattern = /Description\s+(\d+)/i;
    const descriptionMatch = trimmedLine.match(descriptionPattern);
    const refId = descriptionMatch ? descriptionMatch[1] : '';

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
    // Pattern: amount followed by TZS or at end of tab-separated values
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

    // Extract Product Type from description
    let productType = 'Cash Deposit';
    let operationType = 'Agency Banking';

    if (trimmedLine.toLowerCase().includes('cash deposit')) {
      productType = 'Cash Deposit';
    } else if (trimmedLine.toLowerCase().includes('transfer')) {
      productType = 'Transfer';
    } else if (trimmedLine.toLowerCase().includes('withdrawal')) {
      productType = 'Withdrawal';
    } else if (trimmedLine.toLowerCase().includes('payment')) {
      productType = 'Payment';
    }

    if (trimmedLine.toLowerCase().includes('agency banking')) {
      operationType = 'Agency Banking';
    } else if (trimmedLine.toLowerCase().includes('mobile')) {
      operationType = 'Mobile Banking';
    } else if (trimmedLine.toLowerCase().includes('atm')) {
      operationType = 'ATM';
    } else if (trimmedLine.toLowerCase().includes('branch')) {
      operationType = 'Branch';
    }

    // Extract Product Name - usually the branch/office name
    const productNamePattern = /\d{3}\s*-\s*([^-]+)\s*-/;
    const productNameMatch = trimmedLine.match(productNamePattern);
    const productName = productNameMatch ? productNameMatch[1].trim() : 'NMB Banking';

    // Determine transaction type (Credit/Debit)
    let type = 'Credit';
    if (trimmedLine.toLowerCase().includes('withdrawal') ||
      trimmedLine.toLowerCase().includes('debit') ||
      trimmedLine.toLowerCase().includes('payment')) {
      type = 'Debit';
    }

    // Initialize new fields as empty strings for now
    const clientName = '';
    const memberId = '';
    const emailAddress = '';
    const accountNumber = '';
    const principal = '';
    const interest = '';
    const charges = '';
    const chargeName = '';
    const transactionMode = '';
    const transactionReferenceNumber = '';
    const receiptNumber = '';
    const chequeNumber = '';
    const comment = '';

    const isValid = !!(refId || amount || transactionDate);

    return {
      clientName,
      memberId,
      refId,
      userId,
      emailAddress,
      productType,
      productName,
      accountNumber,
      amount,
      type,
      principal,
      interest,
      charges,
      chargeName,
      transactionDate,
      operationType,
      transactionMode,
      transactionReferenceNumber,
      receiptNumber,
      chequeNumber,
      comment,
      rawLine: trimmedLine,
      isValid,
      errorMessage: isValid ? undefined : 'Could not extract required fields',
      nationalId: ''
    };
  } catch (error) {
    return {
      clientName: '',
      memberId: '',
      refId: '',
      userId: '',
      emailAddress: '',
      productType: '',
      productName: '',
      accountNumber: '',
      amount: '',
      type: '',
      principal: '',
      interest: '',
      charges: '',
      chargeName: '',
      transactionDate: '',
      operationType: '',
      transactionMode: '',
      transactionReferenceNumber: '',
      receiptNumber: '',
      chequeNumber: '',
      comment: '',
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
    const transactionDate = dateMatch ? dateMatch[1].replace(/\./g, '-') : ''; // Normalize to DD-MM-YYYY

    // 2. Extract Amounts
    // Strategy: Look for the last 3 numbers in the line (Amount1, Amount2, Balance)
    // The user wants the SECOND amount.
    // Regex to find numbers with optional commas and decimals at the end of the line
    const amountsRegex = /([\d,]+\.\d{2})/g;
    const allAmounts = [...trimmedLine.matchAll(amountsRegex)].map(m => m[1]);

    // We expect at least 3 amounts at the end usually (Debit, Credit, Balance)
    // If we have less, we might have to guess.
    // User said: "amount to be consider ... is the second like for this case"
    // The sample ends with: 0.00 12,500.00 595,288,508.22
    // So we want the second to last amount if we exclude the balance?
    // Actually, let's take the 2nd amount found in the trailing sequence.

    let amount = '';
    // If we found at least 2 amounts, take the second one relative to the transaction part
    // But be careful about numbers in the description.
    // Let's assume the standard format has the structure: ... Debit Credit Balance
    if (allAmounts.length >= 2) {
      // Take the second to last amount (Credit usually, or simply the non-zero one if we wanted to be smart, but user said "second")
      // If the sample is `0.00 12,500.00 595,288,508.22`, matching gives ['0.00', '12,500.00', '595,288,508.22']
      // We want '12,500.00'. That is the 2nd element (index 1).
      // Or index (length - 2).
      if (allAmounts.length >= 3) {
        amount = allAmounts[allAmounts.length - 2];
      } else {
        amount = allAmounts[allAmounts.length - 1]; // Fallback
      }
    } else if (allAmounts.length === 1) {
      amount = allAmounts[0];
    }

    // 3. Extract Description / Ref ID / Account Number
    // Pattern: ... TO FRANKAB...:Name:Account N/A ...
    // Extract account number: 12 digit number usually?
    // In sample: 963330000354
    const accountPattern = /:(\d{10,14})\s+/;
    const accountMatch = trimmedLine.match(accountPattern);
    const accountNumber = accountMatch ? accountMatch[1] : '';

    // Use Account Number as User ID for consistency with NMB logic
    const userId = accountNumber;

    // Ref ID - maybe the long string at the start? "REF:19bd7c60dae84833"
    const refPattern = /REF:([a-zA-Z0-9]+)/;
    const refMatch = trimmedLine.match(refPattern);
    const refId = refMatch ? refMatch[1] : '';

    // 4. Client Name
    // In sample: ...:Lawrence sospeter mshana:963330000354...
    // Between colon and account number
    const namePattern = /:([a-zA-Z\s]+):(?=\d{10,14})/;
    const nameMatch = trimmedLine.match(namePattern);
    const possibleClientName = nameMatch ? nameMatch[1].trim() : '';

    const clientName = possibleClientName; // We'll let database enrichment overwrite this if needed, but this is good to have.

    // Other fields defaults
    const memberId = '';
    const emailAddress = '';
    const productType = 'Transfer'; // Default for these types
    const productName = 'CRDB Transaction';
    const type = 'Credit'; // Defaulting to Credit as per sample (deposit)
    const operationType = 'Digital Banking';
    const transactionMode = 'Digital';
    const transactionReferenceNumber = refId;
    const receiptNumber = '';
    const chequeNumber = '';
    const comment = trimmedLine; // Keep full line for reference

    // Helper functions need to be defined or we duplicate logic?
    // Since we are inside the file, we can't easily reuse helper from parseTransactionLine without refactoring.
    // I'll just return the object directly.

    const isValid = !!(amount || transactionDate);

    return {
      clientName,
      memberId,
      refId,
      userId,
      emailAddress,
      productType,
      productName,
      accountNumber,
      amount,
      type,
      principal: '',
      interest: '',
      charges: '',
      chargeName: '',
      transactionDate,
      operationType,
      transactionMode,
      transactionReferenceNumber,
      receiptNumber,
      chequeNumber,
      comment,
      rawLine: trimmedLine,
      isValid,
      errorMessage: isValid ? undefined : 'Could not extract required fields from CRDB line',
      nationalId: ''
    };

  } catch (error) {
    return createEmptyTransaction(line, `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createEmptyTransaction(line: string, errorMessage?: string): ParsedTransaction {
  return {
    clientName: '',
    memberId: '',
    refId: '',
    userId: '',
    emailAddress: '',
    productType: '',
    productName: '',
    accountNumber: '',
    amount: '',
    type: '',
    principal: '',
    interest: '',
    charges: '',
    chargeName: '',
    transactionDate: '',
    operationType: '',
    transactionMode: '',
    transactionReferenceNumber: '',
    receiptNumber: '',
    chequeNumber: '',
    comment: '',
    rawLine: line,
    isValid: false,
    errorMessage,
    nationalId: ''
  };
}

export function parseTransactions(rawData: string, bankType: 'NMB' | 'CRDB' = 'NMB'): ParseResult {
  const lines = rawData.split('\n').filter(line => line.trim());
  const successful: ParsedTransaction[] = [];
  const failed: ParsedTransaction[] = [];

  for (const line of lines) {
    const parsed = bankType === 'CRDB' ? parseCRDBTransactionLine(line) : parseTransactionLine(line);
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
    'Client Name',
    'Member ID',
    'Ref Id',
    'User Id',
    'Email Address',
    'Product Type',
    'Product Name',
    'AccountNumber',
    'Amount',
    'Type',
    'Principal',
    'Interest',
    'Charges',
    'Charge Name',
    'Transaction Date',
    'Operation Type',
    'Transaction Mode',
    'Transaction Reference Number',
    'Receipt Number',
    'Cheque Number',
    'Comment'
  ];

  const rows = transactions.map(t => [
    t.clientName,
    t.memberId,
    t.refId,
    t.userId,
    t.emailAddress,
    t.productType,
    t.productName,
    t.accountNumber,
    t.amount,
    t.type,
    t.principal,
    t.interest,
    t.charges,
    t.chargeName,
    t.transactionDate,
    t.operationType,
    t.transactionMode,
    t.transactionReferenceNumber,
    t.receiptNumber,
    t.chequeNumber,
    t.comment
  ]);

  return [headers, ...rows];
}

// Database Service for Transaction Storage
import { supabase } from '@/lib/supabase';
import { ParsedTransaction, ParseResult } from './transactionParser';

// Generate or retrieve session ID from localStorage
export function getSessionId(): string {
  const storageKey = 'nmb_parser_session_id';
  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

export interface TransactionBatch {
  id: string;
  session_id: string;
  batch_name: string | null;
  total_lines: number;
  success_count: number;
  fail_count: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerMapping {
  id: string;
  member_id: string;
  ref_id: string | null;
  customer_name: string | null;
  email: string | null;
  account_number: string | null;
  phone_number: string | null;
  loan_product: string | null;
  created_at: string;
}

export interface StoredTransaction {
  id: string;
  batch_id: string;
  ref_id: string;
  user_id: string;
  email_address: string | null;
  product_type: string;
  product_name: string;
  account_number: string | null;
  amount: string;
  transaction_type: string;
  principal: string | null;
  interest: string | null;
  charges: string | null;
  charge_name: string | null;
  transaction_date: string;
  operation_type: string;
  transaction_mode: string | null;
  transaction_ref_no: string | null;
  receipt_no: string | null;
  cheque_no: string | null;
  comment: string | null;
  raw_line: string;
  is_valid: boolean;
  error_message: string | null;
  created_at: string;
}

// Fetch all customer mappings
export async function fetchCustomerMappings(): Promise<CustomerMapping[]> {
  try {
    const { data, error } = await supabase
      .from('customer_mappings')
      .select('*');

    if (error) {
      console.error('Error fetching mappings:', error);
      return [];
    }

    return data as CustomerMapping[];
  } catch (error) {
    console.error('Database error fetching mappings:', error);
    return [];
  }
}

// Bulk insert customer mappings
export async function bulkInsertCustomerMappings(
  mappings: Omit<CustomerMapping, 'id' | 'created_at'>[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('customer_mappings')
      .insert(mappings);

    if (error) {
      console.error('Error inserting mappings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Database error inserting mappings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check for existing transactions in the database
// Returns a Set of IDs that already exist
export async function checkExistingTransactions(
  transactions: ParsedTransaction[],
  bankType: 'NMB' | 'CRDB'
): Promise<{ existingIds: Set<string>; error: string | null }> {
  try {
    const existingIds = new Set<string>();

    if (bankType === 'NMB') {
      const userIds = transactions.map(t => t.userId).filter(id => id);
      if (userIds.length > 0) {
        // Chunk queries to avoid URL length limits
        const chunkSize = 100;
        for (let i = 0; i < userIds.length; i += chunkSize) {
          const chunk = userIds.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('parsed_transactions')
            .select('user_id')
            .in('user_id', chunk);

          if (error) throw error;
          if (data) {
            console.log(`[CheckDuplicates] Found ${data.length} existing NMB transactions in chunk`); // DEBUG LOG
            data.forEach(t => existingIds.add(t.user_id));
          }
        }
      }
    } else if (bankType === 'CRDB') {
      const refIds = transactions.map(t => t.refId).filter(id => id);
      if (refIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < refIds.length; i += chunkSize) {
          const chunk = refIds.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('parsed_transactions')
            .select('ref_id')
            .in('ref_id', chunk);

          if (error) throw error;
          if (data) {
            console.log(`[CheckDuplicates] Found ${data.length} existing CRDB transactions in chunk`); // DEBUG LOG
            data.forEach(t => existingIds.add(t.ref_id));
          }
        }
      }
    }

    console.log(`[CheckDuplicates] Total existing IDs found: ${existingIds.size}`); // DEBUG LOG
    return { existingIds, error: null };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { existingIds: new Set(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Save a batch of parsed transactions to the database
export async function saveBatchToDatabase(
  result: ParseResult,
  batchName?: string
): Promise<{ batchId: string | null; error: string | null; skippedCount: number }> {
  const sessionId = getSessionId();

  // Deduplication Logic
  // We re-run the check here to be safe, or we can trust the UI state. 
  // Ideally, valid data reaching this point should be clean, but a final check prevents race conditions.
  const { existingIds, error: checkError } = await checkExistingTransactions(result.successful, result.bankType);

  if (checkError) {
    return { batchId: null, error: checkError, skippedCount: 0 };
  }

  const transactionsToSave = result.successful.filter(t => {
    if (result.bankType === 'NMB') return !existingIds.has(t.userId);
    return !existingIds.has(t.refId);
  });

  const skippedCount = result.successful.length - transactionsToSave.length;

  try {
    if (transactionsToSave.length === 0) {
      console.log('All transactions were duplicates. Skipping batch creation.');
      return { batchId: null, error: null, skippedCount };
    }

    // Calculate total amount from NEW transactions
    const totalAmount = transactionsToSave.reduce((sum, t) => {
      const amount = parseFloat(t.amount.replace(/,/g, '')) || 0;
      return sum + amount;
    }, 0);

    // Insert batch record
    const { data: batchData, error: batchError } = await supabase
      .from('transaction_batches')
      .insert({
        session_id: sessionId,
        batch_name: batchName || `Batch ${new Date().toLocaleString()}`,
        total_lines: result.totalLines,
        success_count: transactionsToSave.length, // Only count saved ones
        fail_count: result.failCount, // Failed parse count remains same
        total_amount: totalAmount
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error saving batch:', batchError);
      return { batchId: null, error: batchError.message, skippedCount: 0 };
    }

    const batchId = batchData.id;

    // Prepare transaction records (Only for non-duplicates)
    const allTransactions = [
      ...transactionsToSave.map(t => ({
        batch_id: batchId,
        ref_id: t.refId,
        user_id: t.userId,
        email_address: t.emailAddress,
        product_type: t.productType,
        product_name: t.productName,
        account_number: t.accountNumber,
        amount: t.amount,
        transaction_type: t.type,
        principal: t.principal,
        interest: t.interest,
        charges: t.charges,
        charge_name: t.chargeName,
        transaction_date: t.transactionDate,
        operation_type: t.operationType,
        transaction_mode: t.transactionMode,
        transaction_ref_no: t.transactionReferenceNumber,
        receipt_no: t.receiptNumber,
        cheque_no: t.chequeNumber,
        comment: t.comment,
        raw_line: t.rawLine,
        is_valid: true,
        error_message: null
      })),
      ...result.failed.map(t => ({
        batch_id: batchId,
        ref_id: t.refId,
        user_id: t.userId,
        email_address: t.emailAddress,
        product_type: t.productType,
        product_name: t.productName,
        account_number: t.accountNumber,
        amount: t.amount,
        transaction_type: t.type,
        principal: t.principal,
        interest: t.interest,
        charges: t.charges,
        charge_name: t.chargeName,
        transaction_date: t.transactionDate,
        operation_type: t.operationType,
        transaction_mode: t.transactionMode,
        transaction_ref_no: t.transactionReferenceNumber,
        receipt_no: t.receiptNumber,
        cheque_no: t.chequeNumber,
        comment: t.comment,
        raw_line: t.rawLine,
        is_valid: false,
        error_message: t.errorMessage || null
      }))
    ];

    // Insert transactions in batches of 100 to avoid payload limits
    const batchSize = 100;
    for (let i = 0; i < allTransactions.length; i += batchSize) {
      const chunk = allTransactions.slice(i, i + batchSize);
      const { error: txError } = await supabase
        .from('parsed_transactions')
        .insert(chunk);

      if (txError) {
        console.error('Error saving transactions:', txError);
        // Don't fail completely, just log the error
      }
    }

    return { batchId, error: null, skippedCount };
  } catch (error) {
    console.error('Database error:', error);
    return { batchId: null, error: error instanceof Error ? error.message : 'Unknown error', skippedCount: 0 };
  }
}

// Get all batches for the current session
export async function getBatches(
  filters?: {
    startDate?: Date;
    endDate?: Date;
    minSuccessRate?: number;
  }
): Promise<{ batches: TransactionBatch[]; error: string | null }> {
  const sessionId = getSessionId();

  try {
    let query = supabase
      .from('transaction_batches')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching batches:', error);
      return { batches: [], error: error.message };
    }

    let batches = data as TransactionBatch[];

    // Filter by success rate client-side if needed
    if (filters?.minSuccessRate !== undefined) {
      batches = batches.filter(b => {
        const rate = b.total_lines > 0 ? (b.success_count / b.total_lines) * 100 : 0;
        return rate >= (filters.minSuccessRate || 0);
      });
    }

    return { batches, error: null };
  } catch (error) {
    console.error('Database error:', error);
    return { batches: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get transactions for a specific batch
export async function getBatchTransactions(
  batchId: string,
  onlyValid: boolean = false
): Promise<{ transactions: StoredTransaction[]; error: string | null }> {
  try {
    let query = supabase
      .from('parsed_transactions')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (onlyValid) {
      query = query.eq('is_valid', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return { transactions: [], error: error.message };
    }

    return { transactions: data as StoredTransaction[], error: null };
  } catch (error) {
    console.error('Database error:', error);
    return { transactions: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Delete a batch and its transactions
export async function deleteBatch(batchId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('transaction_batches')
      .delete()
      .eq('id', batchId);

    if (error) {
      console.error('Error deleting batch:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Update batch name
export async function updateBatchName(
  batchId: string,
  newName: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('transaction_batches')
      .update({ batch_name: newName, updated_at: new Date().toISOString() })
      .eq('id', batchId);

    if (error) {
      console.error('Error updating batch:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Convert stored transactions to ParsedTransaction format for export
export function convertToExportFormat(transactions: StoredTransaction[]): ParsedTransaction[] {
  return transactions.map(t => ({
    clientName: '', // Stored transactions don't have this yet, would need schema update
    memberId: '',   // Stored transactions don't have this yet
    refId: t.ref_id,
    userId: t.user_id,
    emailAddress: t.email_address || '',
    productType: t.product_type,
    productName: t.product_name,
    accountNumber: t.account_number || '',
    amount: t.amount,
    type: t.transaction_type,
    principal: t.principal || '',
    interest: t.interest || '',
    charges: t.charges || '',
    chargeName: t.charge_name || '',
    transactionDate: t.transaction_date,
    operationType: t.operation_type,
    transactionMode: t.transaction_mode || '',
    transactionReferenceNumber: t.transaction_ref_no || '',
    receiptNumber: t.receipt_no || '',
    chequeNumber: t.cheque_no || '',
    comment: t.comment || '',
    rawLine: t.raw_line,
    isValid: t.is_valid,
    errorMessage: t.error_message || undefined
  }));
}

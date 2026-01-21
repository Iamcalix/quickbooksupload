
import { createClient } from '@supabase/supabase-js';

// Initialize database client (copied from src/lib/supabase.ts)
const supabaseUrl = 'https://zidllezszsrfnuqpjvlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZGxsZXpzenNyZm51cXBqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NzQ5NDgsImV4cCI6MjA4NDQ1MDk0OH0.wTWxdQxDDYA33A85ZPknBZVjDFdSINIBdoaBh1R9l0s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing Supabase Connection (Standalone ES6)...");

    // 1. Try to fetch customer mappings
    const { data: mappings, error: mapError } = await supabase.from('customer_mappings').select('count', { count: 'exact', head: true });
    if (mapError) {
        console.error("Error connecting to 'customer_mappings':", mapError.message);
    } else {
        console.log("Connected to 'customer_mappings'. Connection successful.");
    }

    // 2. Try to SELECT from 'parsed_transactions'
    console.log("Attempting to read from 'parsed_transactions'...");
    const { data: transactions, error: txError } = await supabase.from('parsed_transactions').select('*').limit(5);

    if (txError) {
        console.error("Error querying 'parsed_transactions':", txError.message);
    } else {
        console.log(`Successfully queried 'parsed_transactions'. Rows found: ${transactions ? transactions.length : 0}`);
        if (transactions && transactions.length > 0) {
            console.log("Sample Record:", JSON.stringify(transactions[0], null, 2));
        } else {
            console.log("Table is empty.");
        }
    }

    // 3. Try to INSERT a dummy record to check write permissions
    console.log("Attempting to INSERT dummy record...");
    const dummyTx = {
        batch_id: '00000000-0000-0000-0000-000000000000',
        ref_id: 'TEST_REF_' + Date.now(),
        user_id: 'TEST_USER_' + Date.now(),
        amount: '0.00',
        transaction_type: 'Test',
        product_type: 'Test',
        product_name: 'Test',
        transaction_date: '01-01-2026',
        operation_type: 'Test',
        raw_line: 'Test line',
        is_valid: false,
        error_message: 'Connection Test'
    };

    // Create batch first
    const { data: batchData, error: batchError } = await supabase
        .from('transaction_batches')
        .insert({
            session_id: 'test_session',
            batch_name: 'Connection Test Batch',
            total_lines: 1,
            success_count: 0,
            fail_count: 1,
            total_amount: 0
        })
        .select()
        .single();

    if (batchError) {
        console.error("Error creating test batch:", batchError.message);
    } else {
        console.log("Successfully created test batch:", batchData.id);
        dummyTx.batch_id = batchData.id;

        // Now insert transaction
        const { error: insertError } = await supabase.from('parsed_transactions').insert(dummyTx);
        if (insertError) {
            console.error("Error inserting test transaction:", insertError.message);
        } else {
            console.log("Successfully inserted test transaction.");
        }

        // Cleanup
        await supabase.from('transaction_batches').delete().eq('id', batchData.id);
    }
}

testConnection();

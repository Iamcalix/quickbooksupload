
import { supabase } from '../lib/supabase';

async function testConnection() {
    console.log("Testing Supabase Connection...");

    // 1. Try to fetch customer mappings (usually public or authenticated)
    const { data: mappings, error: mapError } = await supabase.from('customer_mappings').select('count', { count: 'exact', head: true });
    if (mapError) {
        console.error("Error connecting to 'customer_mappings':", mapError.message);
    } else {
        console.log("Connected to 'customer_mappings'. Count:", mappings);
    }

    // 2. Try to insert a dummy record into 'parsed_transactions' (if schema allows nulls or we provide dummy data)
    // We need a valid batch_id first usually.

    // Let's just check if we can SELECT from 'parsed_transactions'
    const { data: transactions, error: txError } = await supabase.from('parsed_transactions').select('*').limit(1);
    if (txError) {
        console.error("Error querying 'parsed_transactions':", txError.message);
        console.error("Details:", txError);
    } else {
        console.log("Successfully queried 'parsed_transactions'. Rows found:", transactions?.length);
    }
}

testConnection();

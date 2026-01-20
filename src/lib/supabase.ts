import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://zidllezszsrfnuqpjvlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZGxsZXpzenNyZm51cXBqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NzQ5NDgsImV4cCI6MjA4NDQ1MDk0OH0.wTWxdQxDDYA33A85ZPknBZVjDFdSINIBdoaBh1R9l0s';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
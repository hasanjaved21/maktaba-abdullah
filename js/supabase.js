const SUPABASE_URL = 'https://mrwjjdywjwvzrdkgwbtm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yd2pqZHl3and2enJka2d3YnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxMTMsImV4cCI6MjA4ODgyNDExM30.rv1RHc1KRVn3yH5ZeUojERkGi7diAYtekuqHf1N1TYI';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabaseClient = supabase;

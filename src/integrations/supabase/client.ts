import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Load Supabase URL and Key from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let supabase: SupabaseClient<Database> | null = null;

if (isSupabaseConfigured) {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} else {
    console.warn("Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set. Database features will be disabled.");
}

export { supabase };
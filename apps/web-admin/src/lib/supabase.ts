import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

// NOTE: Reduce Realtime load: Use Presence for active buses status instead of broadcasting every location change.
// This is more efficient for high-scale tracking.

// Only initialize if we have the required parameters to avoid crashing the app
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder'); // Dummy client to avoid "supabaseUrl is required" error

// Test connection on boot
if (supabaseUrl && supabaseAnonKey) {
  supabase.from('profiles').select('count', { count: 'exact', head: true })
    .then(({ error }) => {
      if (error) logger.error('Supabase connection test failed:', error.message);
      else logger.info('Supabase connection successful');
    });
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL
} from './supabase-config.js';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_URL.includes('.supabase.co') &&
  !SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_');

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

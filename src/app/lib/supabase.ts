/**
 * Centralized Supabase client instance
 * Import this shared instance instead of creating new clients to avoid
 * multiple GoTrueClient instance warnings
 */
import { createClient } from '@supabase/supabase-js';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gbllxumuogsncoiaksum';
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibGx4dW11b2dzbmNvaWFrc3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDQ2NTMsImV4cCI6MjA4ODMyMDY1M30.OF5zATQkfxcwjucq3g1F9gu33OPlikVM20zJ8Tw4m08';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

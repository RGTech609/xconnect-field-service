-- ============================================
-- DATABASE FIX SCRIPT FOR row_id COLUMNS
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- This will fix the auto-generation issue for all tables

-- 1. FIX CUSTOMERS TABLE
-- Issue: text column with no default value
ALTER TABLE customers 
ALTER COLUMN row_id SET DEFAULT gen_random_uuid()::text;

-- 2. FIX DISTRICTS TABLE  
-- Issue: text column with no default value
ALTER TABLE districts 
ALTER COLUMN row_id SET DEFAULT gen_random_uuid()::text;

-- 3. FIX INCIDENTS TABLE (SPECIAL CASE)
-- Issue: Has a numeric sequence default on a TEXT column (type mismatch)
-- Solution: Drop the sequence and use UUID for text columns
ALTER TABLE incidents 
ALTER COLUMN row_id DROP DEFAULT;

ALTER TABLE incidents 
ALTER COLUMN row_id SET DEFAULT gen_random_uuid()::text;

-- Clean up the orphaned sequence
DROP SEQUENCE IF EXISTS incidents_row_id_seq;

-- 4. FIX FIELDVISITS TABLE
-- Issue: text column with no default value (nullable but should still have default)
ALTER TABLE fieldvisits 
ALTER COLUMN row_id SET DEFAULT gen_random_uuid()::text;

-- 5. FIX PANELS TABLE
-- Issue: text column with no default value (nullable but should still have default)
ALTER TABLE panels 
ALTER COLUMN row_id SET DEFAULT gen_random_uuid()::text;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after the fixes to verify everything is correct:
/*
SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'row_id'
AND table_name IN ('customers', 'districts', 'fieldvisits', 'incidents', 'panels')
ORDER BY table_name;
*/

-- Expected result: All tables should now show:
-- column_default = "gen_random_uuid()::text"
-- ✅ This means auto-generation is working!

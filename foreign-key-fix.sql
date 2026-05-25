-- ============================================
-- FIX FOREIGN KEY CONSTRAINT ON failed_component
-- ============================================
-- This will allow you to enter any text value for failed_component
-- without requiring it to exist in the lists table

-- Option 1: DROP the foreign key constraint (RECOMMENDED)
-- This allows free-text entry for failed_component
ALTER TABLE incidents 
DROP CONSTRAINT IF EXISTS fk_incidents_failed_component_lists;

-- Option 2: Make the column nullable if you want to keep the FK but allow empty values
-- (Only run this if you want to keep the FK for existing values)
-- ALTER TABLE incidents 
-- ALTER COLUMN failed_component DROP NOT NULL;

-- ============================================
-- VERIFY THE CONSTRAINT WAS REMOVED
-- ============================================
-- Run this to check if the constraint is gone:
/*
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='incidents'
AND kcu.column_name = 'failed_component';
*/

-- Expected result: No rows returned (constraint has been removed)

-- ============================================
-- ALSO CHECK failure_type COLUMN
-- ============================================
-- This column may have the same issue
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='incidents'
AND kcu.column_name IN ('failed_component', 'failure_type');

-- If failure_type also has a FK constraint, remove it too:
-- ALTER TABLE incidents 
-- DROP CONSTRAINT IF EXISTS fk_incidents_failure_type_lists;

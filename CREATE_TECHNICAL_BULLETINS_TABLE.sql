-- ============================================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO YOUR SUPABASE SQL EDITOR
-- ============================================================================

-- Create the technical_bulletins table
CREATE TABLE technical_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_number TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Information')),
  affected_products TEXT[] DEFAULT '{}',
  affected_parts TEXT[] DEFAULT '{}',
  distribution_list TEXT[] DEFAULT '{}',
  summary TEXT NOT NULL,
  background TEXT,
  technical_details TEXT NOT NULL,
  recommended_actions TEXT[] NOT NULL DEFAULT '{}',
  role_types TEXT[] DEFAULT '{}',
  problem_images JSONB DEFAULT '[]',
  fix_images JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_technical_bulletins_bulletin_number ON technical_bulletins(bulletin_number);
CREATE INDEX idx_technical_bulletins_date ON technical_bulletins(date DESC);
CREATE INDEX idx_technical_bulletins_severity ON technical_bulletins(severity);

-- Enable Row Level Security
ALTER TABLE technical_bulletins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all authenticated users full access)
CREATE POLICY "Allow authenticated users to read bulletins" 
  ON technical_bulletins FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert bulletins" 
  ON technical_bulletins FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update bulletins" 
  ON technical_bulletins FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete bulletins" 
  ON technical_bulletins FOR DELETE 
  TO authenticated 
  USING (true);

-- Add helpful comments
COMMENT ON TABLE technical_bulletins IS 'Stores technical bulletins for customer distribution';

-- ============================================================================
-- DONE! Your technical_bulletins table is now ready to use.
-- ============================================================================

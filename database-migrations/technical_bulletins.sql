-- Technical Bulletins Table
-- This table stores all technical bulletins created through the system

CREATE TABLE IF NOT EXISTS technical_bulletins (
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

-- Create index on bulletin_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_technical_bulletins_bulletin_number ON technical_bulletins(bulletin_number);

-- Create index on date for faster sorting
CREATE INDEX IF NOT EXISTS idx_technical_bulletins_date ON technical_bulletins(date DESC);

-- Create index on severity for filtering
CREATE INDEX IF NOT EXISTS idx_technical_bulletins_severity ON technical_bulletins(severity);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE technical_bulletins ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all bulletins
CREATE POLICY "Allow authenticated users to read bulletins" ON technical_bulletins
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert bulletins
CREATE POLICY "Allow authenticated users to insert bulletins" ON technical_bulletins
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update bulletins
CREATE POLICY "Allow authenticated users to update bulletins" ON technical_bulletins
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete bulletins
CREATE POLICY "Allow authenticated users to delete bulletins" ON technical_bulletins
  FOR DELETE
  TO authenticated
  USING (true);

-- Comments for documentation
COMMENT ON TABLE technical_bulletins IS 'Stores technical bulletins for customer distribution';
COMMENT ON COLUMN technical_bulletins.bulletin_number IS 'Unique bulletin identifier (e.g., 2024-001)';
COMMENT ON COLUMN technical_bulletins.severity IS 'Severity level: Critical, High, Medium, Low, or Information';
COMMENT ON COLUMN technical_bulletins.affected_products IS 'Array of affected product names';
COMMENT ON COLUMN technical_bulletins.affected_parts IS 'Array of affected component/part names';
COMMENT ON COLUMN technical_bulletins.distribution_list IS 'Array of recipient names/districts';
COMMENT ON COLUMN technical_bulletins.recommended_actions IS 'Array of recommended action items';
COMMENT ON COLUMN technical_bulletins.role_types IS 'Array of role types for bulletin contact';
COMMENT ON COLUMN technical_bulletins.problem_images IS 'JSON array of problem/failure images with captions [{url, caption}]';
COMMENT ON COLUMN technical_bulletins.fix_images IS 'JSON array of fix/solution images with captions [{url, caption}]';

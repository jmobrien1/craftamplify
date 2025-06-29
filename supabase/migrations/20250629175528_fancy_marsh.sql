/*
  # Add missing columns to content_calendar and engagement_metrics tables

  1. Changes to content_calendar table
    - Add `scheduled_date` column (timestamp with time zone)
    - This column will store when content is scheduled to be published

  2. Changes to engagement_metrics table  
    - Add `winery_id` column (uuid with foreign key reference)
    - This column will link engagement metrics to specific wineries
    - Add index for performance
    - Update RLS policy to use the new winery_id column

  3. Security
    - Maintain existing RLS policies
    - Update engagement_metrics policy to use direct winery_id reference
*/

-- Add scheduled_date column to content_calendar table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_calendar' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE content_calendar ADD COLUMN scheduled_date timestamptz;
  END IF;
END $$;

-- Add winery_id column to engagement_metrics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'engagement_metrics' AND column_name = 'winery_id'
  ) THEN
    ALTER TABLE engagement_metrics ADD COLUMN winery_id uuid;
  END IF;
END $$;

-- Add foreign key constraint for engagement_metrics.winery_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'engagement_metrics_winery_id_fkey'
  ) THEN
    ALTER TABLE engagement_metrics 
    ADD CONSTRAINT engagement_metrics_winery_id_fkey 
    FOREIGN KEY (winery_id) REFERENCES winery_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for engagement_metrics.winery_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_engagement_metrics_winery_id'
  ) THEN
    CREATE INDEX idx_engagement_metrics_winery_id ON engagement_metrics(winery_id);
  END IF;
END $$;

-- Update RLS policy for engagement_metrics to use direct winery_id reference
DROP POLICY IF EXISTS "Users can access metrics for their winery content" ON engagement_metrics;

CREATE POLICY "Users can access metrics for their winery content"
  ON engagement_metrics
  FOR ALL
  TO authenticated
  USING (
    winery_id IN (
      SELECT wp.id
      FROM winery_profiles wp
      LEFT JOIN user_roles ur ON wp.id = ur.winery_id
      WHERE wp.user_id = auth.uid() OR ur.user_id = auth.uid()
    )
  );
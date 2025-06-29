/*
  # Add research_brief_id column to content_calendar table

  1. New Columns
    - `research_brief_id` (uuid, nullable) - Links content to the research brief that inspired it

  2. Security
    - Add foreign key constraint to research_briefs table
    - Add index for performance

  3. Changes
    - Enables tracking which content was generated from research briefs
    - Supports the Event Engine's proactive content generation
*/

-- Add the research_brief_id column to content_calendar table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_calendar' AND column_name = 'research_brief_id'
  ) THEN
    ALTER TABLE content_calendar ADD COLUMN research_brief_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_calendar_research_brief_id_fkey'
  ) THEN
    ALTER TABLE content_calendar 
    ADD CONSTRAINT content_calendar_research_brief_id_fkey 
    FOREIGN KEY (research_brief_id) REFERENCES research_briefs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_content_calendar_research_brief_id'
  ) THEN
    CREATE INDEX idx_content_calendar_research_brief_id ON content_calendar(research_brief_id);
  END IF;
END $$;
/*
  # Create Raw Events Table for Apify Pipeline

  1. New Tables
    - `raw_events`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `source_url` (text) - The URL that was scraped
      - `raw_content` (text) - Raw HTML/XML content from Apify
      - `is_processed` (boolean) - Whether this data has been analyzed by AI
      - `content_length` (integer) - Size of raw content for debugging
      - `source_name` (text) - Human-readable source name
      - `scrape_timestamp` (timestamp) - When Apify scraped this

  2. Security
    - Enable RLS on `raw_events` table
    - Add policy for system access (Apify webhook and processing function)

  3. Indexes
    - Index on `is_processed` for efficient querying
    - Index on `created_at` for chronological processing
*/

-- Create the raw_events table
CREATE TABLE IF NOT EXISTS raw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  source_url text NOT NULL,
  source_name text,
  raw_content text NOT NULL,
  content_length integer DEFAULT 0,
  is_processed boolean DEFAULT false,
  scrape_timestamp timestamptz DEFAULT now(),
  apify_run_id text,
  error_message text
);

-- Enable RLS
ALTER TABLE raw_events ENABLE ROW LEVEL SECURITY;

-- Create policy for system access (both webhook ingestion and processing)
CREATE POLICY "System can manage raw events"
  ON raw_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_events_is_processed ON raw_events(is_processed);
CREATE INDEX IF NOT EXISTS idx_raw_events_created_at ON raw_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_events_source_url ON raw_events(source_url);

-- Add trigger to automatically set content_length
CREATE OR REPLACE FUNCTION set_content_length()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_length = LENGTH(NEW.raw_content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_content_length
  BEFORE INSERT OR UPDATE ON raw_events
  FOR EACH ROW
  EXECUTE FUNCTION set_content_length();
/*
  # Add OpenAI API Key column to winery_profiles table

  1. New Columns
    - `openai_api_key` (text) - Store user's personal OpenAI API key

  2. Security
    - Column allows null values for users who don't want to provide their own key
    - Existing RLS policies will apply to the new column
    - Users can only access their own API keys
*/

-- Add openai_api_key column to winery_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'openai_api_key'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN openai_api_key text;
  END IF;
END $$;
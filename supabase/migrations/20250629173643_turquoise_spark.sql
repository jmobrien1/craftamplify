/*
  # Add missing columns to winery_profiles table

  1. New Columns
    - `brand_voice` (text) - Store the winery's brand voice/tone
    - `backstory` (text) - Store the winery's story and background
    - `wine_types` (text array) - Store array of wine types the winery produces
    - `target_audience` (text) - Store description of target customers
    - `content_goals` (integer) - Store number of posts per week goal
    - `wordpress_url` (text) - Store WordPress site URL for integration
    - `wordpress_username` (text) - Store WordPress username for API access
    - `wordpress_password` (text) - Store WordPress application password

  2. Security
    - All columns allow null values for flexibility
    - Default values set where appropriate
    - Existing RLS policies will apply to new columns
*/

-- Add brand_voice column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'brand_voice'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN brand_voice text;
  END IF;
END $$;

-- Add backstory column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'backstory'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN backstory text;
  END IF;
END $$;

-- Add wine_types column as text array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'wine_types'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN wine_types text[] DEFAULT '{}';
  END IF;
END $$;

-- Add target_audience column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN target_audience text;
  END IF;
END $$;

-- Add content_goals column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'content_goals'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN content_goals integer DEFAULT 3;
  END IF;
END $$;

-- Add wordpress_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'wordpress_url'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN wordpress_url text;
  END IF;
END $$;

-- Add wordpress_username column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'wordpress_username'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN wordpress_username text;
  END IF;
END $$;

-- Add wordpress_password column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'wordpress_password'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN wordpress_password text;
  END IF;
END $$;
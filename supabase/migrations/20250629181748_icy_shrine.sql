/*
  # Add Brand Voice System Columns

  1. New Columns
    - `brand_personality_summary` (text) - Core personality traits and characteristics
    - `core_tone_attributes` (text) - Key tone descriptors (elegant, approachable, etc.)
    - `messaging_style` (text) - How the brand communicates (formal, casual, storytelling, etc.)
    - `vocabulary_to_use` (text) - Preferred words and phrases
    - `vocabulary_to_avoid` (text) - Words and phrases to avoid
    - `ai_writing_guidelines` (text) - Specific instructions for AI content generation

  2. Purpose
    - Enable authentic, personalized content generation
    - Maintain consistent brand voice across all content
    - Provide detailed style guide for AI agents

  3. Security
    - All columns are part of existing winery_profiles table with RLS enabled
*/

-- Add brand_personality_summary column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'brand_personality_summary'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN brand_personality_summary text;
  END IF;
END $$;

-- Add core_tone_attributes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'core_tone_attributes'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN core_tone_attributes text;
  END IF;
END $$;

-- Add messaging_style column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'messaging_style'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN messaging_style text;
  END IF;
END $$;

-- Add vocabulary_to_use column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'vocabulary_to_use'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN vocabulary_to_use text;
  END IF;
END $$;

-- Add vocabulary_to_avoid column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'vocabulary_to_avoid'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN vocabulary_to_avoid text;
  END IF;
END $$;

-- Add ai_writing_guidelines column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'winery_profiles' AND column_name = 'ai_writing_guidelines'
  ) THEN
    ALTER TABLE winery_profiles ADD COLUMN ai_writing_guidelines text;
  END IF;
END $$;
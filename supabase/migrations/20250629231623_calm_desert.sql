-- Craft Amplify Database Setup Script
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('winery_owner', 'marketing_manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_status AS ENUM ('draft', 'ready_for_review', 'scheduled', 'published');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('blog_post', 'social_media', 'newsletter', 'press_release');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Create winery_profiles table
CREATE TABLE IF NOT EXISTS winery_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  winery_name text NOT NULL,
  location text NOT NULL,
  owner_name text NOT NULL,
  brand_tone text NOT NULL,
  backstory text NOT NULL,
  wines text[] DEFAULT '{}',
  target_audience text NOT NULL,
  weekly_content_goals integer DEFAULT 3,
  wordpress_url text,
  wordpress_username text,
  wordpress_password text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Brand Voice System columns
  brand_voice text,
  wine_types text[] DEFAULT '{}',
  content_goals integer DEFAULT 3,
  brand_personality_summary text,
  core_tone_attributes text,
  messaging_style text,
  vocabulary_to_use text,
  vocabulary_to_avoid text,
  ai_writing_guidelines text
);

-- Enable RLS
ALTER TABLE winery_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_winery_profiles_user_id ON winery_profiles(user_id);

-- RLS Policies for winery_profiles
CREATE POLICY "Users can create own winery profile" ON winery_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own winery profile" ON winery_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own winery profile" ON winery_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  winery_id uuid REFERENCES winery_profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_winery_id ON user_roles(winery_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can read roles for their winery" ON user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    winery_id IN (
      SELECT id FROM winery_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Winery owners can manage user roles" ON user_roles
  FOR ALL TO authenticated
  USING (
    winery_id IN (
      SELECT id FROM winery_profiles WHERE user_id = auth.uid()
    )
  );

-- Create research_briefs table
CREATE TABLE IF NOT EXISTS research_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid REFERENCES winery_profiles(id) ON DELETE CASCADE,
  suggested_theme text NOT NULL,
  key_points text[] DEFAULT '{}',
  local_event_name text,
  local_event_date timestamptz,
  local_event_location text,
  seasonal_context text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE research_briefs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_research_briefs_winery_id ON research_briefs(winery_id);

-- RLS Policies for research_briefs
CREATE POLICY "Users can access research for their winery" ON research_briefs
  FOR ALL TO authenticated
  USING (
    winery_id IN (
      SELECT wp.id FROM winery_profiles wp
      LEFT JOIN user_roles ur ON wp.id = ur.winery_id
      WHERE wp.user_id = auth.uid() OR ur.user_id = auth.uid()
    )
  );

-- Create content_calendar table
CREATE TABLE IF NOT EXISTS content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid REFERENCES winery_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  content_type content_type NOT NULL,
  status content_status DEFAULT 'draft',
  publish_date timestamptz,
  content_url text,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approval_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  scheduled_date timestamptz,
  research_brief_id uuid REFERENCES research_briefs(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_calendar_winery_id ON content_calendar(winery_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_content_calendar_research_brief_id ON content_calendar(research_brief_id);

-- RLS Policies for content_calendar
CREATE POLICY "Users can access content for their winery" ON content_calendar
  FOR ALL TO authenticated
  USING (
    winery_id IN (
      SELECT wp.id FROM winery_profiles wp
      LEFT JOIN user_roles ur ON wp.id = ur.winery_id
      WHERE wp.user_id = auth.uid() OR ur.user_id = auth.uid()
    )
  );

-- Create engagement_metrics table
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES content_calendar(id) ON DELETE CASCADE,
  blog_views integer DEFAULT 0,
  email_opens integer DEFAULT 0,
  email_clicks integer DEFAULT 0,
  social_clicks integer DEFAULT 0,
  club_signups integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  winery_id uuid REFERENCES winery_profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_content_id ON engagement_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_winery_id ON engagement_metrics(winery_id);

-- RLS Policies for engagement_metrics
CREATE POLICY "Users can access metrics for their winery content" ON engagement_metrics
  FOR ALL TO authenticated
  USING (
    winery_id IN (
      SELECT wp.id FROM winery_profiles wp
      LEFT JOIN user_roles ur ON wp.id = ur.winery_id
      WHERE wp.user_id = auth.uid() OR ur.user_id = auth.uid()
    )
  );

-- Create raw_events table for Event Engine
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_raw_events_is_processed ON raw_events(is_processed);
CREATE INDEX IF NOT EXISTS idx_raw_events_created_at ON raw_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_events_source_url ON raw_events(source_url);

-- RLS Policies for raw_events (system access only)
CREATE POLICY "System can manage raw events" ON raw_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to set content_length automatically
CREATE OR REPLACE FUNCTION set_content_length()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_length = LENGTH(NEW.raw_content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content_length
DROP TRIGGER IF EXISTS trigger_set_content_length ON raw_events;
CREATE TRIGGER trigger_set_content_length
  BEFORE INSERT OR UPDATE ON raw_events
  FOR EACH ROW
  EXECUTE FUNCTION set_content_length();

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Craft Amplify database setup completed successfully!' as status;
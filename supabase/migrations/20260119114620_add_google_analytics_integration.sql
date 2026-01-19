/*
  # Add Google Analytics 4 Integration

  1. New Tables
    - `analytics_credentials`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `property_id` (text, GA4 property ID)
      - `credentials_json` (jsonb, encrypted service account credentials)
      - `is_active` (boolean, whether credentials are valid)
      - `last_sync_at` (timestamptz, last successful sync)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `page_analytics`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `page_id` (text, reference to pages.page_id)
      - `week_start_date` (date, start of the week)
      - `pageviews` (integer, total page views)
      - `unique_pageviews` (integer, unique page views)
      - `avg_time_on_page` (float, average time in seconds)
      - `bounce_rate` (float, bounce rate percentage)
      - `synced_at` (timestamptz, when data was fetched)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write their own project data
    - Ensure analytics data is only accessible to project owners

  3. Indexes
    - Add indexes for efficient querying by project_id and page_id
    - Add index for date-based queries
*/

-- Create analytics_credentials table
CREATE TABLE IF NOT EXISTS analytics_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  property_id text NOT NULL,
  credentials_json jsonb NOT NULL,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

-- Create page_analytics table
CREATE TABLE IF NOT EXISTS page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  week_start_date date NOT NULL,
  pageviews integer DEFAULT 0,
  unique_pageviews integer DEFAULT 0,
  avg_time_on_page float DEFAULT 0,
  bounce_rate float DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, page_id, week_start_date)
);

-- Enable RLS
ALTER TABLE analytics_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;

-- Analytics credentials policies
CREATE POLICY "Users can create analytics credentials for their projects"
  ON analytics_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_credentials.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view analytics credentials for their projects"
  ON analytics_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_credentials.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update analytics credentials for their projects"
  ON analytics_credentials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_credentials.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_credentials.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete analytics credentials for their projects"
  ON analytics_credentials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = analytics_credentials.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Page analytics policies
CREATE POLICY "Users can create page analytics for their projects"
  ON page_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_analytics.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view page analytics for their projects"
  ON page_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_analytics.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update page analytics for their projects"
  ON page_analytics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_analytics.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_analytics.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete page analytics for their projects"
  ON page_analytics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_analytics.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS analytics_credentials_project_id_idx ON analytics_credentials(project_id);
CREATE INDEX IF NOT EXISTS page_analytics_project_id_idx ON page_analytics(project_id);
CREATE INDEX IF NOT EXISTS page_analytics_page_id_idx ON page_analytics(page_id);
CREATE INDEX IF NOT EXISTS page_analytics_project_page_idx ON page_analytics(project_id, page_id);
CREATE INDEX IF NOT EXISTS page_analytics_week_date_idx ON page_analytics(week_start_date);

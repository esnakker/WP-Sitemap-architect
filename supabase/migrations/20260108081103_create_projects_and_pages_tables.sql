/*
  # Create projects and pages tables for WP Structure Architect

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `url` (text, WordPress site URL)
      - `title` (text, project name)
      - `description` (text, optional project notes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, reference to auth.users)

    - `pages`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `page_id` (text, WordPress page ID)
      - `title` (text, page title)
      - `type` (text, content type: page, post, custom, ghost)
      - `parent_id` (text, nullable parent page ID)
      - `url` (text, page URL)
      - `summary` (text, page summary)
      - `thumbnail_url` (text, page screenshot URL)
      - `menu_order` (integer)
      - `status` (text, restructuring status: keep, move, delete, neutral)
      - `notes` (text, optional user notes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write their own data
    - Add policies to restrict access by project ownership
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'page',
  parent_id text,
  url text NOT NULL,
  summary text,
  thumbnail_url text,
  menu_order integer DEFAULT 0,
  status text DEFAULT 'neutral' CHECK (status IN ('keep', 'move', 'delete', 'neutral')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, page_id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Projects table policies
CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Pages table policies (restrict by project ownership)
CREATE POLICY "Users can create pages in their projects"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view pages in their projects"
  ON pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages in their projects"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pages in their projects"
  ON pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS pages_project_id_idx ON pages(project_id);
CREATE INDEX IF NOT EXISTS pages_project_id_page_id_idx ON pages(project_id, page_id);

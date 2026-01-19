/*
  # Add Collaboration and Audit Features

  1. New Tables
    - `project_owners`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text) - Business unit/owner name
      - `color` (text, nullable) - Optional hex color for UI badges
      - `sort_order` (int) - Display order
      - `created_at` (timestamptz)
      
    - `page_comments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `page_id` (text) - References the page/node id
      - `author_user_id` (uuid, nullable, foreign key to auth.users)
      - `author_name` (text) - Display name
      - `author_is_guest` (boolean) - Whether author is a guest or project owner
      - `body` (text) - Comment content
      - `created_at` (timestamptz)
      
    - `activity_log`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `actor_user_id` (uuid, nullable, foreign key to auth.users)
      - `actor_name` (text) - Display name of who performed action
      - `actor_is_guest` (boolean) - Whether actor is guest
      - `action_type` (text) - Type of action performed
      - `page_id` (text, nullable) - Which page was affected
      - `payload` (jsonb) - Details about the action (old/new values)
      - `created_at` (timestamptz)
      
    - `project_snapshots`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `label` (text) - Snapshot name
      - `description` (text, nullable)
      - `created_by_user_id` (uuid, nullable)
      - `created_by_name` (text)
      - `created_by_is_guest` (boolean)
      - `state` (jsonb) - Full serialized project state
      - `created_at` (timestamptz)
      
    - `project_share_links`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `token` (text, unique) - Share token
      - `role` (text) - Access level (e.g., 'editor')
      - `is_active` (boolean) - Whether link is still valid
      - `expires_at` (timestamptz, nullable)
      - `created_by_user_id` (uuid)
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - `pages` table:
      - Add `owner_id` (uuid, nullable, foreign key to project_owners)
      - Add `relevance` (int, default 3) - Relevance score 1-5

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated project owners
    - Add secure RPC functions for guest access via token

  4. Indexes
    - Add indexes for performance on foreign keys and frequently queried fields
*/

-- Add new fields to pages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE pages ADD COLUMN owner_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'relevance'
  ) THEN
    ALTER TABLE pages ADD COLUMN relevance int DEFAULT 3;
  END IF;
END $$;

-- Create project_owners table
CREATE TABLE IF NOT EXISTS project_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners visible to project owner"
  ON project_owners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_owners.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owner can manage project owners"
  ON project_owners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_owners.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_owners.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create page_comments table
CREATE TABLE IF NOT EXISTS page_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  author_user_id uuid REFERENCES auth.users(id),
  author_name text NOT NULL,
  author_is_guest boolean DEFAULT false,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE page_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments visible to project owner"
  ON page_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_comments.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owner can manage comments"
  ON page_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_comments.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_comments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_name text NOT NULL,
  actor_is_guest boolean DEFAULT false,
  action_type text NOT NULL,
  page_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity log visible to project owner"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = activity_log.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Activity log insertable by project owner"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = activity_log.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create project_snapshots table
CREATE TABLE IF NOT EXISTS project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_by_name text NOT NULL,
  created_by_is_guest boolean DEFAULT false,
  state jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snapshots visible to project owner"
  ON project_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_snapshots.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owner can manage snapshots"
  ON project_snapshots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_snapshots.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_snapshots.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create project_share_links table
CREATE TABLE IF NOT EXISTS project_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Share links visible to project owner"
  ON project_share_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_share_links.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owner can manage share links"
  ON project_share_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_share_links.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_share_links.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add foreign key constraint for pages.owner_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pages_owner_id_fkey'
  ) THEN
    ALTER TABLE pages
    ADD CONSTRAINT pages_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES project_owners(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_owners_project_id ON project_owners(project_id);
CREATE INDEX IF NOT EXISTS idx_page_comments_project_id ON page_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_page_comments_page_id ON page_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_share_links_token ON project_share_links(token);
CREATE INDEX IF NOT EXISTS idx_pages_owner_id ON pages(owner_id);

-- Create RPC function to validate share token and get project info
CREATE OR REPLACE FUNCTION get_shared_project(share_token text)
RETURNS TABLE (
  project_id uuid,
  project_title text,
  project_url text,
  role text,
  is_valid boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.url,
    psl.role,
    (psl.is_active AND (psl.expires_at IS NULL OR psl.expires_at > now()))::boolean as is_valid
  FROM project_share_links psl
  JOIN projects p ON p.id = psl.project_id
  WHERE psl.token = share_token;
END;
$$;

-- Create RPC function for guests to add comments
CREATE OR REPLACE FUNCTION add_guest_comment(
  share_token text,
  guest_name text,
  p_page_id text,
  comment_body text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_comment_id uuid;
BEGIN
  -- Validate token and get project_id
  SELECT project_id INTO v_project_id
  FROM project_share_links
  WHERE token = share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;
  
  -- Insert comment
  INSERT INTO page_comments (
    project_id,
    page_id,
    author_name,
    author_is_guest,
    body
  ) VALUES (
    v_project_id,
    p_page_id,
    guest_name,
    true,
    comment_body
  )
  RETURNING id INTO v_comment_id;
  
  RETURN v_comment_id;
END;
$$;

-- Create RPC function for guests to log activity
CREATE OR REPLACE FUNCTION log_guest_activity(
  share_token text,
  guest_name text,
  p_action_type text,
  p_page_id text,
  p_payload jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_log_id uuid;
BEGIN
  -- Validate token and get project_id
  SELECT project_id INTO v_project_id
  FROM project_share_links
  WHERE token = share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_log (
    project_id,
    actor_name,
    actor_is_guest,
    action_type,
    page_id,
    payload
  ) VALUES (
    v_project_id,
    guest_name,
    true,
    p_action_type,
    p_page_id,
    p_payload
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create RPC function for guests to update page fields
CREATE OR REPLACE FUNCTION update_page_as_guest(
  share_token text,
  guest_name text,
  p_project_id uuid,
  p_page_id text,
  p_updates jsonb
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_valid boolean;
BEGIN
  -- Validate token
  SELECT (is_active AND (expires_at IS NULL OR expires_at > now())) INTO v_valid
  FROM project_share_links
  WHERE token = share_token
    AND project_id = p_project_id;
  
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;
  
  -- Update page with provided fields
  UPDATE pages
  SET
    parent_id = COALESCE((p_updates->>'parent_id')::text, parent_id),
    menu_order = COALESCE((p_updates->>'menu_order')::int, menu_order),
    status = COALESCE((p_updates->>'status')::text, status),
    owner_id = CASE 
      WHEN p_updates ? 'owner_id' THEN (p_updates->>'owner_id')::uuid 
      ELSE owner_id 
    END,
    relevance = COALESCE((p_updates->>'relevance')::int, relevance),
    updated_at = now()
  WHERE project_id = p_project_id
    AND page_id = p_page_id;
  
  RETURN true;
END;
$$;

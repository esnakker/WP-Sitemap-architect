/*
  # Multi-User Collaboration and Email Domain Validation

  1. Changes to Existing Tables
    - Keep `projects.user_id` as the creator/owner
    - Update RLS policies to allow all authenticated users to access projects
    - Only project creator can delete projects

  2. Email Domain Validation
    - Add a trigger function to validate email domains on signup
    - Only @fme.de and @fme-us.com domains are allowed
    - Validation happens at database level for security

  3. Security Updates
    - All authenticated users can view and edit all projects
    - Only project creator can delete their own projects
    - Activity log and comments track which user made changes

  4. Notes
    - Share links remain in database but are not used in the UI
    - All authenticated FME users can collaborate on all projects
*/

-- Create function to validate email domain
CREATE OR REPLACE FUNCTION validate_email_domain()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract domain from email
  IF NEW.email IS NOT NULL THEN
    -- Check if email ends with allowed domains
    IF NOT (
      NEW.email ILIKE '%@fme.de' OR 
      NEW.email ILIKE '%@fme-us.com'
    ) THEN
      RAISE EXCEPTION 'Registration is restricted to @fme.de and @fme-us.com email addresses';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table to validate email domain
-- Note: This trigger will fire before insert on auth.users
DROP TRIGGER IF EXISTS validate_user_email_domain ON auth.users;
CREATE TRIGGER validate_user_email_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_email_domain();

-- Update RLS policies for projects table
-- All authenticated users can view all projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Authenticated users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can update all projects
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Authenticated users can update all projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- All authenticated users can insert projects
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only project creator can delete
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Only creator can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update RLS policies for pages table
-- All authenticated users can access all pages
DROP POLICY IF EXISTS "Users can view own project pages" ON pages;
CREATE POLICY "Authenticated users can view all pages"
  ON pages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert pages to own projects" ON pages;
CREATE POLICY "Authenticated users can insert pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own project pages" ON pages;
CREATE POLICY "Authenticated users can update all pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own project pages" ON pages;
CREATE POLICY "Authenticated users can delete all pages"
  ON pages FOR DELETE
  TO authenticated
  USING (true);

-- Update RLS policies for page_history table
DROP POLICY IF EXISTS "Users can view own project page history" ON page_history;
CREATE POLICY "Authenticated users can view all page history"
  ON page_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert page history for own projects" ON page_history;
CREATE POLICY "Authenticated users can insert page history"
  ON page_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update RLS policies for project_owners
DROP POLICY IF EXISTS "Project owners visible to project owner" ON project_owners;
CREATE POLICY "Project owners visible to all authenticated users"
  ON project_owners FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Project owner can manage project owners" ON project_owners;
CREATE POLICY "Authenticated users can manage project owners"
  ON project_owners FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update RLS policies for page_comments
DROP POLICY IF EXISTS "Comments visible to project owner" ON page_comments;
CREATE POLICY "Comments visible to all authenticated users"
  ON page_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Project owner can manage comments" ON page_comments;
CREATE POLICY "Authenticated users can manage comments"
  ON page_comments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update RLS policies for activity_log
DROP POLICY IF EXISTS "Activity log visible to project owner" ON activity_log;
CREATE POLICY "Activity log visible to all authenticated users"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Activity log insertable by project owner" ON activity_log;
CREATE POLICY "Activity log insertable by all authenticated users"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update RLS policies for project_snapshots
DROP POLICY IF EXISTS "Snapshots visible to project owner" ON project_snapshots;
CREATE POLICY "Snapshots visible to all authenticated users"
  ON project_snapshots FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Project owner can manage snapshots" ON project_snapshots;
CREATE POLICY "Authenticated users can manage snapshots"
  ON project_snapshots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep share links policies as-is (feature dormant but data preserved)
-- We'll keep the table and policies for potential future use or data reference

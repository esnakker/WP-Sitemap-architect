/*
  # Optimize RLS Policies and Remove Unused Indexes

  ## Performance Optimizations
  
  1. **RLS Policy Optimization**
     - Replace direct `auth.uid()` calls with `(select auth.uid())` in all policies
     - This prevents the function from being re-evaluated for each row
     - Significantly improves query performance at scale
     - Affects all policies on both `projects` and `pages` tables

  2. **Index Cleanup**
     - Remove unused index `pages_project_id_idx`
     - Remove unused index `pages_project_id_page_id_idx`
     - The UNIQUE constraint on `(project_id, page_id)` already provides an index
     - These redundant indexes were causing unnecessary storage overhead

  ## Security
  - All RLS policies remain functionally identical
  - No changes to access control logic
  - Only performance optimizations applied

  ## Note
  The following issues require Supabase dashboard configuration and cannot be fixed via migrations:
  - Auth DB Connection Strategy (switch to percentage-based allocation)
  - Leaked Password Protection (enable HaveIBeenPwned integration)
*/

-- Drop existing policies for projects table
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Drop existing policies for pages table
DROP POLICY IF EXISTS "Users can create pages in their projects" ON pages;
DROP POLICY IF EXISTS "Users can view pages in their projects" ON pages;
DROP POLICY IF EXISTS "Users can update pages in their projects" ON pages;
DROP POLICY IF EXISTS "Users can delete pages in their projects" ON pages;

-- Recreate optimized policies for projects table
CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Recreate optimized policies for pages table
CREATE POLICY "Users can create pages in their projects"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view pages in their projects"
  ON pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update pages in their projects"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete pages in their projects"
  ON pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pages.project_id
      AND projects.user_id = (select auth.uid())
    )
  );

-- Remove unused indexes (UNIQUE constraint already provides indexing)
DROP INDEX IF EXISTS pages_project_id_idx;
DROP INDEX IF EXISTS pages_project_id_page_id_idx;
/*
  # Create page history table for versioning

  ## Overview
  This migration creates a table to track page position changes (parent_id updates) 
  in the site structure, enabling undo functionality.

  ## New Tables
  - `page_history`
    - `id` (uuid, primary key)
    - `project_id` (uuid, foreign key to projects)
    - `page_id` (uuid, foreign key to pages)
    - `old_parent_id` (text, nullable - previous parent page ID)
    - `new_parent_id` (text, nullable - new parent page ID)
    - `old_menu_order` (integer - previous menu order)
    - `new_menu_order` (integer - new menu order)
    - `changed_by` (uuid, user who made the change)
    - `created_at` (timestamp, when change was made)

  ## Security
  - Enable RLS on page_history table
  - Users can only view/manage history for pages in their projects
  - Users can only create history entries for pages they own
*/

CREATE TABLE IF NOT EXISTS page_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  old_parent_id text,
  new_parent_id text,
  old_menu_order integer,
  new_menu_order integer,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE page_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for their project pages"
  ON page_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_history.project_id
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create history entries for their project pages"
  ON page_history FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = changed_by
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = page_history.project_id
      AND projects.user_id = (select auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS page_history_project_id_idx ON page_history(project_id);
CREATE INDEX IF NOT EXISTS page_history_page_id_idx ON page_history(page_id);
CREATE INDEX IF NOT EXISTS page_history_created_at_idx ON page_history(created_at DESC);
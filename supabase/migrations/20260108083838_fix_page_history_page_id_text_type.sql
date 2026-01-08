/*
  # Fix page_history.page_id type to text

  Change page_history.page_id from uuid to text to match pages.page_id,
  then establish proper foreign key constraint on composite key.
*/

DO $$
BEGIN
  ALTER TABLE page_history 
  DROP CONSTRAINT IF EXISTS page_history_page_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE page_history 
ALTER COLUMN page_id SET DATA TYPE text USING page_id::text;

ALTER TABLE page_history
ADD CONSTRAINT page_history_project_page_fkey 
FOREIGN KEY (project_id, page_id) REFERENCES pages(project_id, page_id) ON DELETE CASCADE;
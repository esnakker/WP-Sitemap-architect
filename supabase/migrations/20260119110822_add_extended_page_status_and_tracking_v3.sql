/*
  # Extended Page Status and Movement Tracking

  1. Changes to pages table
    - Add `moved_from_parent_id` field to track when pages are moved
    - Add `merge_target_id` field to specify master page for merge operations
    - Extend status to include new types: 'ghost', 'update', 'merge'

  2. Existing Status Types (from current data)
    - `neutral`: Default/no special status
    - `move`: Page marked for moving
    - `active`, `archived`, `redirect`, `new`, `remove`: Original planned statuses

  3. New Status Types
    - `ghost`: Placeholder for planned pages that don't exist yet
    - `update`: Content needs to be rewritten (task flag)
    - `merge`: Content from multiple pages to be combined

  4. Movement Tracking
    - When a page is moved, store the previous parent_id in moved_from_parent_id
    - This allows showing movement history in the detail view

  5. Merge Operations
    - merge_target_id points to the "master page" for merge operations
    - Only relevant when status is 'merge'
*/

-- Add new columns to pages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'moved_from_parent_id'
  ) THEN
    ALTER TABLE pages ADD COLUMN moved_from_parent_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'merge_target_id'
  ) THEN
    ALTER TABLE pages ADD COLUMN merge_target_id text;
  END IF;
END $$;

-- Drop the old status constraint
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;

-- Add new constraint with all status types (existing + new)
ALTER TABLE pages ADD CONSTRAINT pages_status_check 
  CHECK (status IS NULL OR status IN (
    'neutral', 'move', 'active', 'archived', 'redirect', 'new', 'remove', 
    'ghost', 'update', 'merge'
  ));

-- Add index for moved_from_parent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pages_moved_from_parent_id ON pages(moved_from_parent_id);

-- Add index for merge_target_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pages_merge_target_id ON pages(merge_target_id);

-- Add comment to document the new fields
COMMENT ON COLUMN pages.moved_from_parent_id IS 'Stores the previous parent_id when a page is moved to track movement history';
COMMENT ON COLUMN pages.merge_target_id IS 'Points to the master page ID when status is merge - defines which page to merge into';

/*
  # Add Hide in Navigation Status

  1. Status Update
    - Add 'hide_in_navigation' as a new allowed status value for pages
    - This status indicates pages that should not appear in the site's navigation menus
    - Useful for pages that exist but should be hidden from main navigation (e.g., thank you pages, special landing pages)

  2. Existing Status Types
    - `neutral`: Default/no special status
    - `move`: Page marked for moving
    - `active`, `archived`, `redirect`, `new`, `remove`: Original planned statuses
    - `ghost`: Placeholder for planned pages that don't exist yet
    - `update`: Content needs to be rewritten (task flag)
    - `merge`: Content from multiple pages to be combined

  3. New Status Type
    - `hide_in_navigation`: Page exists but should not appear in navigation menus
*/

-- Drop the old status constraint
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;

-- Add new constraint with all status types including hide_in_navigation
ALTER TABLE pages ADD CONSTRAINT pages_status_check 
  CHECK (status IS NULL OR status IN (
    'neutral', 'move', 'active', 'archived', 'redirect', 'new', 'remove', 
    'ghost', 'update', 'merge', 'hide_in_navigation'
  ));
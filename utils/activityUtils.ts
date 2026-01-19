import { ActivityLog, SitePage } from '../types';

export function formatActivityMessage(activity: ActivityLog, pages: SitePage[]): string {
  const pageName = pages.find(p => p.id === activity.page_id)?.title || 'Unknown Page';

  switch (activity.action_type) {
    case 'page_moved': {
      const { oldParent, newParent } = activity.payload;
      return `moved "${pageName}" from ${oldParent || 'root'} to ${newParent || 'root'}`;
    }

    case 'status_changed': {
      const { oldStatus, newStatus } = activity.payload;
      return `changed status of "${pageName}" from ${oldStatus} to ${newStatus}`;
    }

    case 'owner_changed': {
      const { oldOwner, newOwner } = activity.payload;
      return `changed owner of "${pageName}" from ${oldOwner || 'none'} to ${newOwner || 'none'}`;
    }

    case 'relevance_changed': {
      const { oldRelevance, newRelevance } = activity.payload;
      return `changed relevance of "${pageName}" from ${oldRelevance} to ${newRelevance}`;
    }

    case 'comment_added':
      return `added a comment to "${pageName}"`;

    case 'snapshot_created': {
      const { snapshotName } = activity.payload;
      return `created snapshot "${snapshotName}"`;
    }

    case 'snapshot_restored': {
      const { snapshotName } = activity.payload;
      return `restored snapshot "${snapshotName}"`;
    }

    case 'action_undone':
      return `undid last action`;

    default:
      return `performed ${activity.action_type}`;
  }
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

import { Node, Edge } from 'reactflow';

export enum ContentType {
  PAGE = 'page',
  POST = 'post',
  CUSTOM = 'custom',
  GHOST = 'ghost'
}

export type PageStatus =
  | 'neutral'
  | 'move'
  | 'active'
  | 'archived'
  | 'redirect'
  | 'new'
  | 'remove'
  | 'update'
  | 'merge'
  | 'hide_in_navigation';

export interface SitePage {
  id: string;
  title: string;
  type: ContentType;
  parentId: string | null;
  url: string;
  summary: string;
  thumbnailUrl: string;
  menuOrder?: number;
  status?: PageStatus;
  notes?: string;
  ownerId?: string;
  relevance?: number;
  movedFromParentId?: string;
  mergeTargetId?: string;
}

export interface GraphData {
  nodes: Node<SitePage>[];
  edges: Edge[];
}

export interface CrawlerConfig {
  url: string;
  includePages: boolean;
  includePosts: boolean;
  includeCustom: boolean;
  username?: string;
  appPassword?: string;
}

export interface ProjectOwner {
  id: string;
  project_id: string;
  name: string;
  color?: string;
  sort_order: number;
  created_at: string;
}

export interface PageComment {
  id: string;
  project_id: string;
  page_id: string;
  author_user_id?: string;
  author_name: string;
  author_is_guest: boolean;
  body: string;
  created_at: string;
}

export type ActivityActionType =
  | 'page_moved'
  | 'status_changed'
  | 'owner_changed'
  | 'relevance_changed'
  | 'comment_added'
  | 'snapshot_created'
  | 'snapshot_restored'
  | 'action_undone';

export interface ActivityLog {
  id: string;
  project_id: string;
  actor_user_id?: string;
  actor_name: string;
  actor_is_guest: boolean;
  action_type: ActivityActionType;
  page_id?: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface ProjectSnapshot {
  id: string;
  project_id: string;
  label: string;
  description?: string;
  created_by_user_id?: string;
  created_by_name: string;
  created_by_is_guest: boolean;
  state: any;
  created_at: string;
}

export interface ProjectShareLink {
  id: string;
  project_id: string;
  token: string;
  role: string;
  is_active: boolean;
  expires_at?: string;
  created_by_user_id: string;
  created_at: string;
}

export interface Actor {
  user_id?: string;
  name: string;
  is_guest: boolean;
}

export interface FilterState {
  statuses: PageStatus[];
  owners: string[];
  types: ContentType[];
  relevanceMin: number;
  relevanceMax: number;
  searchText: string;
}

export interface AnalyticsCredentials {
  id: string;
  project_id: string;
  property_id: string;
  credentials_json: any;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PageAnalytics {
  id: string;
  project_id: string;
  page_id: string;
  week_start_date: string;
  pageviews: number;
  unique_pageviews: number;
  avg_time_on_page: number;
  bounce_rate: number;
  synced_at: string;
  created_at: string;
}

export interface PageAnalyticsSummary {
  totalPageviews: number;
  avgWeeklyPageviews: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  weeklyData: {
    week: string;
    pageviews: number;
  }[];
}
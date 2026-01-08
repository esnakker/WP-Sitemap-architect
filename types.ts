import { Node, Edge } from 'reactflow';

export enum ContentType {
  PAGE = 'page',
  POST = 'post',
  CUSTOM = 'custom',
  GHOST = 'ghost'
}

export type PageStatus = 'keep' | 'move' | 'delete' | 'neutral';

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
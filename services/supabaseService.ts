import { createClient } from '@supabase/supabase-js';
import { SitePage } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Project {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PageRecord {
  id: string;
  project_id: string;
  page_id: string;
  title: string;
  type: string;
  parent_id: string | null;
  url: string;
  summary: string;
  thumbnail_url: string;
  menu_order: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const supabaseService = {
  async createProject(url: string, title: string, description?: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        url,
        title,
        description,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create project');
    return data;
  },

  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProject(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to update project');
    return data;
  },

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  },

  async savePages(projectId: string, pages: SitePage[]): Promise<void> {
    if (pages.length === 0) return;

    const pageRecords = pages.map((page) => ({
      project_id: projectId,
      page_id: page.id,
      title: page.title,
      type: page.type,
      parent_id: page.parentId,
      url: page.url,
      summary: page.summary,
      thumbnail_url: page.thumbnailUrl,
      menu_order: page.menuOrder || 0,
      status: page.status || 'neutral',
      notes: page.notes || null,
    }));

    const { error } = await supabase
      .from('pages')
      .upsert(pageRecords, { onConflict: 'project_id,page_id' });

    if (error) throw error;
  },

  async getPages(projectId: string): Promise<SitePage[]> {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('project_id', projectId)
      .order('menu_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((record) => ({
      id: record.page_id,
      title: record.title,
      type: record.type as any,
      parentId: record.parent_id,
      url: record.url,
      summary: record.summary,
      thumbnailUrl: record.thumbnail_url,
      menuOrder: record.menu_order,
      status: record.status as any,
      notes: record.notes || undefined,
    }));
  },

  async updatePageStatus(projectId: string, pageId: string, status: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('pages')
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('page_id', pageId);

    if (error) throw error;
  },

  async updatePageThumbnail(projectId: string, pageId: string, thumbnailUrl: string): Promise<void> {
    const { error } = await supabase
      .from('pages')
      .update({
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('page_id', pageId);

    if (error) throw error;
  },
};

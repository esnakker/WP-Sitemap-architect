import { supabaseService, supabase, Project, PageRecord } from '../services/supabaseService';

export interface ExportData {
  version: string;
  exportDate: string;
  project: Project;
  pages: PageRecord[];
}

export const exportUtils = {
  async exportProject(projectId: string): Promise<void> {
    const project = await supabaseService.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const { data: pages, error } = await supabase
      .from('pages')
      .select('*')
      .eq('project_id', projectId)
      .order('menu_order', { ascending: true });

    if (error) throw error;

    const exportData: ExportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      project,
      pages: pages || [],
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  validateExportData(data: any): data is ExportData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.version === 'string' &&
      typeof data.exportDate === 'string' &&
      data.project &&
      Array.isArray(data.pages)
    );
  },
};

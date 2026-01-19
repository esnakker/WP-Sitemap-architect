import React, { useState, useEffect } from 'react';
import { supabaseService, Project } from '../services/supabaseService';
import { Folder, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface ProjectManagerProps {
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
  refreshTrigger?: number;
  currentUserId?: string;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onProjectSelect, onNewProject, refreshTrigger, currentUserId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [refreshTrigger]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await supabaseService.getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Sind Sie sicher, dass Sie dieses Projekt löschen möchten?')) return;

    try {
      setDeleting(projectId);
      await supabaseService.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Projekte</h2>
              <p className="text-sm text-slate-500">{projects.length} gespeichert</p>
            </div>
          </div>
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus size={18} />
            Neues Projekt
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          )}

          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} className="shrink-0" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          {!loading && projects.length === 0 && !error && (
            <div className="text-center py-8">
              <Folder className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500 mb-4">Noch keine Projekte</p>
              <button
                onClick={onNewProject}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors"
              >
                Erstes Projekt erstellen
              </button>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{project.title}</h3>
                    <p className="text-sm text-slate-500 truncate">{project.url}</p>
                    {project.description && (
                      <p className="text-xs text-slate-400 mt-1">{project.description}</p>
                    )}
                    {currentUserId && project.user_id !== currentUserId && (
                      <p className="text-xs text-blue-600 mt-1">Shared project</p>
                    )}
                  </div>
                  {currentUserId && project.user_id === currentUserId && (
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      disabled={deleting === project.id}
                      className="ml-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Projekt löschen (nur Ersteller)"
                    >
                      {deleting === project.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

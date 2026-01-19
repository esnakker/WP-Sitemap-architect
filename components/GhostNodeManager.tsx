import React, { useState, useEffect } from 'react';
import { X, Plus, Ghost, Trash2 } from 'lucide-react';
import { SitePage, ContentType } from '../types';
import { supabaseService } from '../services/supabaseService';

interface GhostNodeManagerProps {
  projectId: string;
  allPages: SitePage[];
  onClose: () => void;
  onGhostCreated?: () => void;
}

export const GhostNodeManager: React.FC<GhostNodeManagerProps> = ({
  projectId,
  allPages,
  onClose,
  onGhostCreated,
}) => {
  const [ghostPages, setGhostPages] = useState<SitePage[]>([]);
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const ghosts = allPages.filter(p => p.type === ContentType.GHOST);
    setGhostPages(ghosts);
  }, [allPages]);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const newGhost: SitePage = {
        id: `ghost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        type: ContentType.GHOST,
        parentId: parentId || null,
        url: '',
        summary: 'Ghost page for planning',
        thumbnailUrl: '',
        status: 'neutral',
      };

      await supabaseService.savePages(projectId, [newGhost]);

      setTitle('');
      setParentId('');
      onGhostCreated?.();
    } catch (err) {
      console.error('Failed to create ghost page:', err);
      alert('Fehler beim Erstellen der Ghost-Seite');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ghostId: string) => {
    if (!confirm('Diese Ghost-Seite wirklich löschen?')) return;

    try {
      await supabaseService.deletePage(projectId, ghostId);
      onGhostCreated?.();
    } catch (err) {
      console.error('Failed to delete ghost page:', err);
      alert('Fehler beim Löschen der Ghost-Seite');
    }
  };

  const availableParents = allPages.filter(p => p.id !== 'root');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded">
              <Ghost size={20} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ghost Pages</h2>
              <p className="text-sm text-slate-500">Platzhalter für zukünftige Seiten</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Plus size={16} />
              Neue Ghost-Seite erstellen
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titel
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Neue Landingpage"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Parent-Seite (optional)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Keine (Root-Level)</option>
                  {availableParents.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.type === ContentType.GHOST ? '👻 ' : ''}{page.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreate}
                disabled={!title.trim() || isSaving}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSaving ? 'Erstelle...' : 'Ghost-Seite erstellen'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3">
              Existierende Ghost-Seiten ({ghostPages.length})
            </h3>

            {ghostPages.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Ghost size={48} className="mx-auto mb-2 opacity-30" />
                <p>Noch keine Ghost-Seiten erstellt</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ghostPages.map((ghost) => {
                  const parent = allPages.find(p => p.id === ghost.parentId);
                  return (
                    <div
                      key={ghost.id}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{ghost.title}</div>
                        {parent && (
                          <div className="text-xs text-slate-500 mt-1">
                            Parent: {parent.type === ContentType.GHOST ? '👻 ' : ''}{parent.title}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(ghost.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Ghost-Seite löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

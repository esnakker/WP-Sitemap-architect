import React, { useState, useEffect } from 'react';
import { X, Plus, Copy, CheckCircle, Trash2 } from 'lucide-react';
import { ProjectShareLink } from '../types';
import { supabaseService } from '../services/supabaseService';

interface ShareManagerProps {
  projectId: string;
  onClose: () => void;
}

export const ShareManager: React.FC<ShareManagerProps> = ({ projectId, onClose }) => {
  const [links, setLinks] = useState<ProjectShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, [projectId]);

  const loadLinks = async () => {
    try {
      const data = await supabaseService.getShareLinks(projectId);
      setLinks(data);
    } catch (err) {
      console.error('Failed to load share links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const link = await supabaseService.createShareLink(projectId);
      setLinks([link, ...links]);
    } catch (err) {
      console.error('Failed to create share link:', err);
      alert('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm('Revoke this share link? Users will no longer be able to access the project with it.')) {
      return;
    }

    try {
      await supabaseService.revokeShareLink(linkId);
      setLinks(links.map(l => l.id === linkId ? { ...l, is_active: false } : l));
    } catch (err) {
      console.error('Failed to revoke link:', err);
      alert('Failed to revoke link');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">Share Project</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  Share links allow guest editors to view and edit the project structure. They can modify pages, add comments, but cannot delete the project.
                </p>
              </div>

              <div className="space-y-2">
                {links.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic">
                    No share links yet. Create one to share this project.
                  </div>
                ) : (
                  links.map(link => (
                    <div
                      key={link.id}
                      className={`p-3 rounded border ${
                        link.is_active
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-slate-600 truncate">
                            {window.location.origin}/share/{link.token}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {link.is_active ? 'Active' : 'Revoked'} • {link.role}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {link.is_active && (
                            <button
                              onClick={() => handleCopyLink(link.token)}
                              className="p-1.5 text-blue-600 hover:text-blue-700"
                              title="Copy link"
                            >
                              {copiedToken === link.token ? (
                                <CheckCircle size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          )}
                          {link.is_active && (
                            <button
                              onClick={() => handleRevoke(link.id)}
                              className="p-1.5 text-red-400 hover:text-red-600"
                              title="Revoke"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={handleCreateLink}
                  disabled={creating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Create New Share Link
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded font-medium hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

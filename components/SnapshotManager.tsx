import React, { useState, useEffect } from 'react';
import { X, Plus, Camera, RotateCcw, Trash2 } from 'lucide-react';
import { ProjectSnapshot, Actor } from '../types';
import { supabaseService } from '../services/supabaseService';
import { formatRelativeTime } from '../utils/activityUtils';

interface SnapshotManagerProps {
  projectId: string;
  onClose: () => void;
  actor?: Actor;
  onRestore?: (snapshotId: string) => void;
}

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({
  projectId,
  onClose,
  actor,
  onRestore,
}) => {
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, [projectId]);

  const loadSnapshots = async () => {
    try {
      const data = await supabaseService.getSnapshots(projectId);
      setSnapshots(data);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!newSnapshotLabel.trim() || creating) return;
    alert('Snapshot creation requires integration with App.tsx state - feature in progress');
  };

  const handleRestore = async (snapshot: ProjectSnapshot) => {
    if (!confirm(`Restore snapshot "${snapshot.label}"? This will overwrite current state.`)) {
      return;
    }

    if (onRestore) {
      onRestore(snapshot.id);
    } else {
      alert('Restore functionality requires App.tsx integration');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snapshot?')) return;

    try {
      await supabaseService.deleteSnapshot(id);
      setSnapshots(snapshots.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
      alert('Failed to delete snapshot');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">Snapshots</h2>
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
              <div className="space-y-2">
                {snapshots.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic">
                    No snapshots yet. Create one to save the current state.
                  </div>
                ) : (
                  snapshots.map(snapshot => (
                    <div
                      key={snapshot.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{snapshot.label}</div>
                        <div className="text-xs text-slate-500">
                          by {snapshot.created_by_name} • {formatRelativeTime(snapshot.created_at)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(snapshot)}
                          className="p-1.5 text-blue-600 hover:text-blue-700"
                          title="Restore"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(snapshot.id)}
                          className="p-1.5 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Create New Snapshot</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Snapshot name..."
                    value={newSnapshotLabel}
                    onChange={(e) => setNewSnapshotLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={!newSnapshotLabel.trim() || creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Camera size={16} />
                    Create
                  </button>
                </div>
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

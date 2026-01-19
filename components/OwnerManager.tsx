import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { ProjectOwner } from '../types';
import { supabaseService } from '../services/supabaseService';

interface OwnerManagerProps {
  projectId: string;
  onClose: () => void;
}

export const OwnerManager: React.FC<OwnerManagerProps> = ({ projectId, onClose }) => {
  const [owners, setOwners] = useState<ProjectOwner[]>([]);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerColor, setNewOwnerColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOwners();
  }, [projectId]);

  const loadOwners = async () => {
    try {
      const data = await supabaseService.getProjectOwners(projectId);
      setOwners(data);
    } catch (err) {
      console.error('Failed to load owners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwner = async () => {
    if (!newOwnerName.trim()) return;

    try {
      const owner = await supabaseService.createProjectOwner(
        projectId,
        newOwnerName.trim(),
        newOwnerColor
      );
      setOwners([...owners, owner]);
      setNewOwnerName('');
      setNewOwnerColor('#3b82f6');
    } catch (err) {
      console.error('Failed to create owner:', err);
      alert('Failed to create owner');
    }
  };

  const handleStartEdit = (owner: ProjectOwner) => {
    setEditingId(owner.id);
    setEditName(owner.name);
    setEditColor(owner.color || '#3b82f6');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const updated = await supabaseService.updateProjectOwner(id, {
        name: editName,
        color: editColor,
      });
      setOwners(owners.map(o => (o.id === id ? updated : o)));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update owner:', err);
      alert('Failed to update owner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this owner? Pages assigned to this owner will have no owner.')) {
      return;
    }

    try {
      await supabaseService.deleteProjectOwner(id);
      setOwners(owners.filter(o => o.id !== id));
    } catch (err) {
      console.error('Failed to delete owner:', err);
      alert('Failed to delete owner');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">Manage Business Units</h2>
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
                {owners.map(owner => (
                  <div
                    key={owner.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200"
                  >
                    {editingId === owner.id ? (
                      <>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(owner.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: owner.color || '#3b82f6' }}
                        />
                        <div className="flex-1 text-sm font-medium text-slate-700">
                          {owner.name}
                        </div>
                        <button
                          onClick={() => handleStartEdit(owner)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(owner.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Add New Business Unit</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newOwnerColor}
                    onChange={(e) => setNewOwnerColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="Business unit name..."
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOwner()}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={handleAddOwner}
                    disabled={!newOwnerName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add
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

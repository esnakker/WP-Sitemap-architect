import React, { useState } from 'react';
import { Users, Camera, Share2, Undo2 } from 'lucide-react';
import { OwnerManager } from './OwnerManager';
import { SnapshotManager } from './SnapshotManager';
import { ShareManager } from './ShareManager';

interface ProjectToolbarProps {
  projectId: string;
  onUndo?: () => void;
  canUndo?: boolean;
}

export const ProjectToolbar: React.FC<ProjectToolbarProps> = ({
  projectId,
  onUndo,
  canUndo = false,
}) => {
  const [showOwnerManager, setShowOwnerManager] = useState(false);
  const [showSnapshotManager, setShowSnapshotManager] = useState(false);
  const [showShareManager, setShowShareManager] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo last action"
        >
          <Undo2 size={14} />
          Undo
        </button>

        <button
          onClick={() => setShowOwnerManager(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
          title="Manage business units"
        >
          <Users size={14} />
          Owners
        </button>

        <button
          onClick={() => setShowSnapshotManager(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
          title="Manage snapshots"
        >
          <Camera size={14} />
          Snapshots
        </button>

        <button
          onClick={() => setShowShareManager(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
          title="Share project"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>

      {showOwnerManager && (
        <OwnerManager projectId={projectId} onClose={() => setShowOwnerManager(false)} />
      )}

      {showSnapshotManager && (
        <SnapshotManager projectId={projectId} onClose={() => setShowSnapshotManager(false)} />
      )}

      {showShareManager && (
        <ShareManager projectId={projectId} onClose={() => setShowShareManager(false)} />
      )}
    </>
  );
};

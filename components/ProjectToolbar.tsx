import React, { useState } from 'react';
import { Users, Camera, Undo2, BarChart3 } from 'lucide-react';
import { OwnerManager } from './OwnerManager';
import { SnapshotManager } from './SnapshotManager';
import { AnalyticsConfig } from './AnalyticsConfig';
import { SitePage } from '../types';

interface ProjectToolbarProps {
  projectId: string;
  pages?: SitePage[];
  onUndo?: () => void;
  canUndo?: boolean;
  onAnalyticsSynced?: () => void;
}

export const ProjectToolbar: React.FC<ProjectToolbarProps> = ({
  projectId,
  pages = [],
  onUndo,
  canUndo = false,
  onAnalyticsSynced,
}) => {
  const [showOwnerManager, setShowOwnerManager] = useState(false);
  const [showSnapshotManager, setShowSnapshotManager] = useState(false);
  const [showAnalyticsConfig, setShowAnalyticsConfig] = useState(false);

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
          onClick={() => setShowAnalyticsConfig(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
          title="Configure Google Analytics"
        >
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      {showOwnerManager && (
        <OwnerManager projectId={projectId} onClose={() => setShowOwnerManager(false)} />
      )}

      {showSnapshotManager && (
        <SnapshotManager projectId={projectId} onClose={() => setShowSnapshotManager(false)} />
      )}

      {showAnalyticsConfig && (
        <AnalyticsConfig
          projectId={projectId}
          pages={pages}
          onClose={() => setShowAnalyticsConfig(false)}
          onSyncComplete={() => {
            setShowAnalyticsConfig(false);
            onAnalyticsSynced?.();
          }}
        />
      )}
    </>
  );
};

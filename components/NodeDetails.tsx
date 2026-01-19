import React, { useState, useEffect } from 'react';
import { SitePage, PageStatus, ProjectOwner, Actor } from '../types';
import { X, ExternalLink, Link as LinkIcon, Trash2, ArrowRightLeft, CheckCircle, RotateCcw, Loader2, Ghost, FileEdit, Merge, Archive, ExternalLinkIcon, Plus } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { CommentsSection } from './CommentsSection';
import clsx from 'clsx';

interface Props {
  node: SitePage | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<SitePage>) => void;
  allPages?: SitePage[];
  projectId?: string;
  actor?: Actor;
  shareToken?: string;
}

const NodeDetails: React.FC<Props> = ({ node, onClose, onUpdate, allPages = [], projectId, actor, shareToken }) => {
  const [isUndoing, setIsUndoing] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [owners, setOwners] = useState<ProjectOwner[]>([]);

  useEffect(() => {
    if (!node || !projectId) {
      setHasHistory(false);
      return;
    }

    const checkHistory = async () => {
      try {
        const history = await supabaseService.getLatestPageHistory(node.id, projectId);
        setHasHistory(!!history);
      } catch (err) {
        console.error('Failed to check history:', err);
        setHasHistory(false);
      }
    };

    checkHistory();
  }, [node, projectId]);

  useEffect(() => {
    if (!projectId) return;

    const loadOwners = async () => {
      try {
        const data = await supabaseService.getProjectOwners(projectId);
        setOwners(data);
      } catch (err) {
        console.error('Failed to load owners:', err);
      }
    };

    loadOwners();
  }, [projectId]);

  if (!node) return null;

  const currentStatus = node.status || 'neutral';
  const parentNode = node.parentId ? allPages.find(p => p.id === node.parentId) : null;
  const movedFromParent = node.movedFromParentId ? allPages.find(p => p.id === node.movedFromParentId) : null;

  const handleStatusToggle = (status: PageStatus) => {
    const newStatus = currentStatus === status ? 'neutral' : status;
    onUpdate(node.id, { status: newStatus, mergeTargetId: newStatus === 'merge' ? node.mergeTargetId : undefined });
  };

  const handleUndo = async () => {
    if (!projectId || isUndoing) return;

    setIsUndoing(true);
    try {
      const history = await supabaseService.getLatestPageHistory(node.id, projectId);
      if (!history) {
        alert('Keine Historie verfügbar');
        setIsUndoing(false);
        return;
      }

      await supabaseService.updatePagePosition(projectId, node.id, history.old_parent_id, history.old_menu_order);
      onUpdate(node.id, { parentId: history.old_parent_id, menuOrder: history.old_menu_order });
      setHasHistory(false);
      alert('Position wiederhergestellt!');
    } catch (err: any) {
      console.error('Failed to undo:', err);
      alert('Fehler beim Rückgängigmachen: ' + err.message);
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="fixed right-6 top-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-right fade-in duration-300 flex flex-col max-h-[85vh]">
      <div className="relative aspect-video bg-slate-100 shrink-0">
        <img 
            src={node.thumbnailUrl} 
            alt={node.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
                (e.target as HTMLImageElement).src = `https://via.placeholder.com/320x180?text=${encodeURIComponent(node.title)}`;
            }}
        />
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
        >
            <X size={16} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4 overflow-y-auto">
        <div>
            <h2 className="text-slate-800 font-bold text-lg leading-tight mb-2">{node.title}</h2>
            <a
                href={node.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 text-xs hover:text-blue-600 transition-colors break-all flex items-start gap-1.5"
            >
                 <LinkIcon size={12} className="mt-0.5 shrink-0" />
                 {node.url}
            </a>
        </div>

        {/* Parent Node */}
        <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Übergeordnete Seite</span>
            {parentNode ? (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="text-sm text-slate-700 font-medium flex-1 truncate">{parentNode.title}</span>
                        {hasHistory && (
                            <button
                                onClick={handleUndo}
                                disabled={isUndoing}
                                className="p-1.5 hover:bg-slate-200 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                                title="Zur vorherigen Position zurückgehen"
                            >
                                {isUndoing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} className="text-slate-600" />}
                            </button>
                        )}
                    </div>
                    {movedFromParent && movedFromParent.id !== parentNode.id && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                            <ArrowRightLeft size={12} className="text-amber-600 shrink-0" />
                            <span className="text-xs text-amber-700">
                                Verschoben von: <span className="font-medium">{movedFromParent.title}</span>
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm text-slate-500 italic">
                    Keine übergeordnete Seite (Root-Ebene)
                </div>
            )}
        </div>

        {/* Status */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Status</span>
            <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                    onClick={() => handleStatusToggle('move')}
                    className={clsx(
                        "py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'move'
                            ? "bg-orange-100 border-orange-300 text-orange-800 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-orange-50 hover:border-orange-200"
                    )}
                    title="Page will be moved"
                >
                    <ArrowRightLeft size={14} />
                    Move
                </button>

                <button
                    onClick={() => handleStatusToggle('remove')}
                    className={clsx(
                        "py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'remove'
                            ? "bg-red-100 border-red-300 text-red-800 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200"
                    )}
                    title="Page will be removed"
                >
                    <Trash2 size={14} />
                    Remove
                </button>

                <button
                    onClick={() => handleStatusToggle('new')}
                    className={clsx(
                        "py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'new'
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200"
                    )}
                    title="New page"
                >
                    <Plus size={14} />
                    New
                </button>

                <button
                    onClick={() => handleStatusToggle('ghost')}
                    className={clsx(
                        "py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'ghost'
                            ? "bg-slate-100 border-slate-300 text-slate-800 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                    )}
                    title="Ghost node - planned page"
                >
                    <Ghost size={14} />
                    Ghost
                </button>

                <button
                    onClick={() => handleStatusToggle('update')}
                    className={clsx(
                        "py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'update'
                            ? "bg-yellow-100 border-yellow-300 text-yellow-800 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-yellow-50 hover:border-yellow-200"
                    )}
                    title="Content needs to be rewritten"
                >
                    <FileEdit size={14} />
                    Update
                </button>

                <button
                    onClick={() => handleStatusToggle('merge')}
                    className={clsx(
                        "py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'merge'
                            ? "bg-amber-100 border-amber-300 text-amber-800 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-200"
                    )}
                    title="Merge with another page"
                >
                    <Merge size={14} />
                    Merge
                </button>
            </div>

            {currentStatus === 'merge' && (
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Master Page (Merge Target)</label>
                    <select
                        value={node.mergeTargetId || ''}
                        onChange={(e) => onUpdate(node.id, { mergeTargetId: e.target.value || undefined })}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    >
                        <option value="">Select master page...</option>
                        {allPages.filter(p => p.id !== node.id).map((page) => (
                            <option key={page.id} value={page.id}>
                                {page.title}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">Content will be merged into the selected master page</p>
                </div>
            )}
        </div>

        {/* Owner */}
        <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Business Unit</span>
            <select
                value={node.ownerId || ''}
                onChange={(e) => onUpdate(node.id, { ownerId: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
                <option value="">No owner</option>
                {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                        {owner.name}
                    </option>
                ))}
            </select>
        </div>

        {/* Relevance */}
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Relevance</span>
                <span className="text-sm font-bold text-blue-600">{node.relevance || 3}</span>
            </div>
            <input
                type="range"
                min="1"
                max="5"
                value={node.relevance || 3}
                onChange={(e) => onUpdate(node.id, { relevance: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Low</span>
                <span>High</span>
            </div>
        </div>

        {/* Comments */}
        {projectId && actor && (
            <CommentsSection
                projectId={projectId}
                pageId={node.id}
                actor={actor}
                shareToken={shareToken}
            />
        )}

        <div className="pt-2">
            <a 
                href={node.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors text-sm border border-blue-200"
            >
                <ExternalLink size={16} />
                Seite öffnen
            </a>
        </div>
      </div>
    </div>
  );
};

export default NodeDetails;
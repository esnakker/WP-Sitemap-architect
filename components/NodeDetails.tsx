import React, { useState, useEffect } from 'react';
import { SitePage, PageStatus } from '../types';
import { X, ExternalLink, Link as LinkIcon, Trash2, ArrowRightLeft, CheckCircle, RotateCcw, Loader2 } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import clsx from 'clsx';

interface Props {
  node: SitePage | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<SitePage>) => void;
  allPages?: SitePage[];
  projectId?: string;
}

const NodeDetails: React.FC<Props> = ({ node, onClose, onUpdate, allPages = [], projectId }) => {
  const [isUndoing, setIsUndoing] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

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

  if (!node) return null;

  const currentStatus = node.status || 'neutral';
  const parentNode = node.parentId ? allPages.find(p => p.id === node.parentId) : null;

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
            ) : (
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm text-slate-500 italic">
                    Keine übergeordnete Seite (Root-Ebene)
                </div>
            )}
        </div>

        {/* Status Ampel */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Status</span>
            <div className="flex gap-2">
                <button
                    onClick={() => onUpdate(node.id, { status: 'keep' })}
                    className={clsx(
                        "flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'keep' 
                            ? "bg-green-100 border-green-300 text-green-800 shadow-sm" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-green-50 hover:border-green-200"
                    )}
                >
                    <CheckCircle size={14} />
                    Behalten
                </button>
                
                <button
                    onClick={() => onUpdate(node.id, { status: 'move' })}
                    className={clsx(
                        "flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'move' 
                            ? "bg-orange-100 border-orange-300 text-orange-800 shadow-sm" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-orange-50 hover:border-orange-200"
                    )}
                >
                    <ArrowRightLeft size={14} />
                    Verschieben
                </button>

                <button
                    onClick={() => onUpdate(node.id, { status: 'delete' })}
                    className={clsx(
                        "flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-all text-[10px] font-medium border",
                        currentStatus === 'delete' 
                            ? "bg-red-100 border-red-300 text-red-800 shadow-sm" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200"
                    )}
                >
                    <Trash2 size={14} />
                    Entfernen
                </button>
            </div>
        </div>

        {/* Notes */}
        <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Notizen</span>
            <textarea 
                value={node.notes || ''}
                onChange={(e) => onUpdate(node.id, { notes: e.target.value })}
                placeholder="Fügen Sie hier Kommentare oder Anmerkungen zur Neustrukturierung hinzu..."
                className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
            />
        </div>

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
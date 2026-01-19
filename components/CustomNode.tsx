import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { SitePage, ContentType } from '../types';
import { getTypeColor } from '../utils/graphUtils';
import { ExternalLink, MessageSquareText } from 'lucide-react';
import clsx from 'clsx';

const CustomNode = ({ data, selected }: NodeProps<SitePage>) => {
  const isGhost = data.type === ContentType.GHOST;
  const hasNotes = !!data.notes && data.notes.trim().length > 0;

  // Status Colors
  let statusClasses = "bg-white border-slate-300";
  let borderStyle = "";

  if (isGhost) {
    statusClasses = "bg-slate-50 border-slate-400";
    borderStyle = "border-dashed";
  } else {
    if (data.status === 'neutral') statusClasses = "bg-white border-slate-300";
    if (data.status === 'move') statusClasses = "bg-orange-50 border-orange-300 ring-orange-100";
    if (data.status === 'active') statusClasses = "bg-green-50 border-green-300 ring-green-100";
    if (data.status === 'archived') statusClasses = "bg-slate-50 border-slate-300 ring-slate-100";
    if (data.status === 'redirect') statusClasses = "bg-blue-50 border-blue-300 ring-blue-100";
    if (data.status === 'new') statusClasses = "bg-emerald-50 border-emerald-300 ring-emerald-100";
    if (data.status === 'remove') statusClasses = "bg-red-50 border-red-300 ring-red-100";
    if (data.status === 'update') statusClasses = "bg-yellow-50 border-yellow-300 ring-yellow-100";
    if (data.status === 'merge') statusClasses = "bg-amber-50 border-amber-300 ring-amber-100";
  }

  const ring = selected ? 'ring-2 ring-blue-500 !border-blue-500' : '';

  return (
    <div className={clsx(
        "shadow-sm rounded-md overflow-hidden transition-all duration-200 border w-[220px] p-3 relative",
        statusClasses,
        borderStyle,
        ring,
        isGhost ? "opacity-70" : ""
    )}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />

      {hasNotes && (
          <div className="absolute top-1 right-1 text-slate-400">
             <MessageSquareText size={12} fill="currentColor" className="opacity-50" />
          </div>
      )}

      <div className="flex flex-col gap-1">
        <h3 className={clsx(
            "text-sm font-semibold leading-tight line-clamp-2 pr-4",
            isGhost ? "italic text-slate-500" : "text-slate-800"
        )} title={data.title}>
            {data.title}
        </h3>

        <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-blue-500 hover:underline truncate flex items-center gap-1 mt-1"
            onClick={(e) => e.stopPropagation()}
            title={data.url}
        >
            {data.url}
            <ExternalLink size={8} />
        </a>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};

export default memo(CustomNode);
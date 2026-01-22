import React, { useState, useEffect } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SitePage, ContentType, ProjectOwner } from '../types';
import { TreeNode, moveTreeNode, getNodePosition } from '../utils/treeUtils';
import { supabaseService } from '../services/supabaseService';
import { FileText, Newspaper, Box, Ghost, ChevronRight, ChevronDown, GripVertical, AlertCircle, MessageSquareText } from 'lucide-react';
import { getTypeColor } from '../utils/graphUtils';
import clsx from 'clsx';

interface Props {
  data: TreeNode[];
  readOnly?: boolean;
  onSelectNode: (node: SitePage) => void;
  onDataChange?: (newData: TreeNode[]) => void;
  label: string;
  projectId?: string;
  owners?: ProjectOwner[];
  isPageFiltered?: (page: SitePage) => boolean;
  hideFiltered?: boolean;
}

const NodeIcon = ({ type }: { type: ContentType }) => {
  switch(type) {
    case ContentType.POST: return <Newspaper size={14} className="text-green-600" />;
    case ContentType.CUSTOM: return <Box size={14} className="text-purple-600" />;
    case ContentType.GHOST: return <Ghost size={14} className="text-amber-500" />;
    default: return <FileText size={14} className="text-blue-500" />;
  }
};

const CustomNode = ({
  node,
  style,
  dragHandle,
  tree,
  owners,
  isPageFiltered
}: NodeRendererProps<TreeNode> & {
  owners?: ProjectOwner[];
  isPageFiltered?: (page: SitePage) => boolean;
}) => {
  const isGhost = node.data.type === ContentType.GHOST;
  const hasNotes = !!node.data.notes && node.data.notes.trim().length > 0;
  const isFiltered = isPageFiltered ? isPageFiltered(node.data) : false;

  // Explicitly check for children existence to determine if arrow should be shown
  const childCount = node.data.children ? node.data.children.length : 0;
  const hasChildren = childCount > 0;

  // Find owner color
  const ownerColor = node.data.ownerId && owners
    ? owners.find(o => o.id === node.data.ownerId)?.color
    : undefined;

  // Status Styling (Ghost is handled by ContentType, not status)
  let statusStyle = "";
  if (isGhost) {
    statusStyle = "bg-slate-50/50 border-slate-200 border-dashed";
  } else {
    if (node.data.status === 'keep') statusStyle = "bg-green-50/50 border-green-200";
    if (node.data.status === 'move') statusStyle = "bg-orange-50/50 border-orange-200";
    if (node.data.status === 'delete') statusStyle = "bg-red-50/50 border-red-200 opacity-60";
    if (node.data.status === 'update') statusStyle = "bg-yellow-50/50 border-yellow-200";
    if (node.data.status === 'merge') statusStyle = "bg-amber-50/50 border-amber-200";
  }

  return (
    <div
      style={style}
      ref={dragHandle}
      onClick={() => node.select()}
      className={clsx(
        "flex items-center gap-2 px-2 py-1 mx-2 my-0.5 rounded cursor-pointer transition-colors outline-none group border",
        statusStyle || "border-transparent",
        node.isSelected ? "!bg-blue-50 !border-blue-200" : (!statusStyle && "hover:bg-slate-100"),
        isGhost ? "opacity-70" : "",
        isFiltered ? "opacity-30 grayscale" : ""
      )}
    >
      <div
        onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) node.toggle();
        }}
        className={clsx(
            "p-1 rounded shrink-0 flex items-center justify-center",
            hasChildren ? "hover:bg-slate-200 text-slate-400 cursor-pointer" : "cursor-default"
        )}
      >
        {!hasChildren ? <div className="w-4" /> : (
            node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        )}
      </div>

      {/* Child Count Indicator */}
      {hasChildren && (
        <span className="text-[10px] text-slate-400 font-medium -ml-1 mr-1 min-w-[12px] text-center select-none">
            {childCount}
        </span>
      )}

      {/* Owner Color Indicator */}
      {ownerColor && (
        <div
          className="w-2 h-2 rounded-full shrink-0 border border-white shadow-sm"
          style={{ backgroundColor: ownerColor }}
          title="Assigned owner"
        />
      )}

      <div className="shrink-0">
         <NodeIcon type={node.data.type} />
      </div>

      <span className={clsx(
          "text-sm truncate select-none flex-1 flex items-center gap-2",
          isGhost ? "italic text-slate-500" : "text-slate-700 font-medium"
      )}>
        {node.data.title}
        {hasNotes && <MessageSquareText size={10} className="text-slate-400" />}
      </span>

      {!tree.props.disableDrag && (
          <GripVertical size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
      )}
    </div>
  );
};

// Workaround for AutoSizer type incompatibility in strict TS environments
const Sizer = AutoSizer as any;

const SiteTree: React.FC<Props> = ({
  data,
  readOnly = false,
  onSelectNode,
  onDataChange,
  label,
  projectId,
  owners,
  isPageFiltered,
  hideFiltered = false
}) => {
  // Filter tree data if hideFiltered is true
  const filterTreeData = (nodes: TreeNode[]): TreeNode[] => {
    if (!hideFiltered || !isPageFiltered) return nodes;

    return nodes
      .filter(node => !isPageFiltered(node.data))
      .map(node => ({
        ...node,
        children: node.children ? filterTreeData(node.children) : undefined
      }));
  };

  const displayData = filterTreeData(data);

  // Handle Tree Updates (Drag & Drop)
  const handleMove = async ({ dragIds, parentId, index }: any) => {
    if (readOnly || !onDataChange) return;

    const dragId = dragIds[0];
    const oldPosition = getNodePosition(data, dragId);

    if (!oldPosition) return;

    // Calculate new state
    const newData = moveTreeNode(data, dragIds, parentId, index);

    // Save history and update moved_from_parent_id if projectId is available
    if (projectId && oldPosition.parentId !== parentId) {
      try {
        await supabaseService.savePageHistory(
          projectId,
          dragId,
          oldPosition.parentId,
          parentId,
          oldPosition.menuOrder,
          index
        );

        await supabaseService.updatePageMovedFrom(
          projectId,
          dragId,
          oldPosition.parentId
        );
      } catch (err) {
        console.error('Failed to save page history:', err);
      }
    }

    // Propagate change
    onDataChange(newData);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
         <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            {label}
         </div>
         <div className="text-xs text-slate-400">
            {displayData.length} Root Items
         </div>
      </div>

      {/* Tree Area */}
      <div className="flex-1 min-h-0 bg-white relative">
        <Sizer>
            {({ width, height }: { width: number; height: number }) => (
                <Tree
                    data={displayData}
                    width={width}
                    height={height}
                    rowHeight={36}
                    indent={24}
                    disableDrag={readOnly}
                    disableDrop={readOnly}
                    initialOpenState={false}
                    onMove={handleMove}
                    onSelect={(nodes) => {
                        if (nodes.length > 0 && nodes[0].data) {
                            onSelectNode(nodes[0].data);
                        }
                    }}
                >
                    {(props) => <CustomNode {...props} owners={owners} isPageFiltered={isPageFiltered} />}
                </Tree>
            )}
        </Sizer>
      </div>
      
      {/* Footer / Hint */}
      {!readOnly && (
          <div className="px-4 py-2 bg-slate-50 text-[10px] text-slate-400 text-center border-t border-slate-100">
             Drag & Drop um Struktur zu ändern
          </div>
      )}
    </div>
  );
};

export default SiteTree;
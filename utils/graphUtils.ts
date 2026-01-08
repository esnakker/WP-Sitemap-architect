import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import { SitePage, GraphData, ContentType } from '../types';

// Updated dimensions for the text-only node design
const nodeWidth = 240; 
const nodeHeight = 80; 

/**
 * Converts a flat list of SitePage objects into ReactFlow Nodes and Edges.
 */
export const buildGraphFromPages = (pages: SitePage[]): GraphData => {
  const nodes: Node<SitePage>[] = pages.map((page) => ({
    id: page.id,
    type: 'custom', 
    data: { ...page },
    position: { x: 0, y: 0 },
  }));

  const edges: Edge[] = [];
  pages.forEach((page) => {
    if (page.parentId) {
      edges.push({
        id: `e${page.parentId}-${page.id}`,
        source: page.parentId,
        target: page.id,
        type: 'smoothstep', // smoothstep is better for org charts
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });
    }
  });

  return getLayoutedElements(nodes, edges);
};

/**
 * Uses Dagre to automatically calculate the layout of the tree.
 */
export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB'): GraphData => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 60,   // Horizontal spacing
    ranksep: 100,  // Vertical spacing
    align: 'DL'    // Align Down-Left often helps with tree balance
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Safety check if dagre failed to position a node (orphan)
    if (!nodeWithPosition) return node;

    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes: layoutedNodes, edges };
};

export const findChildren = (nodes: SitePage[], parentId: string): SitePage[] => {
  return nodes.filter(n => n.parentId === parentId);
};

export const getTypeColor = (type: ContentType) => {
  switch (type) {
    case ContentType.PAGE: return 'bg-blue-100 text-blue-800 border-blue-200';
    case ContentType.POST: return 'bg-green-100 text-green-800 border-green-200';
    case ContentType.CUSTOM: return 'bg-purple-100 text-purple-800 border-purple-200';
    case ContentType.GHOST: return 'bg-amber-100 text-amber-600 border-amber-200 dashed-border';
    default: return 'bg-gray-100 text-gray-800';
  }
};
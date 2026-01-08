import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges, 
  OnNodesChange, 
  OnEdgesChange,
  Node,
  Edge,
  Connection,
  addEdge,
  ReactFlowProvider
} from 'reactflow';
import JSZip from 'jszip';

import { buildGraphFromPages } from './utils/graphUtils';
import { buildTreeFromPages, flattenTree, TreeNode, updateTreeNodesImage, updateNodeDataInTree } from './utils/treeUtils';
import { SitePage, CrawlerConfig, GraphData } from './types';
import { analyzeSiteStructure } from './services/geminiService';
import SiteCrawler from './components/SiteCrawler';
import CustomNode from './components/CustomNode';
import NodeDetails from './components/NodeDetails';
import SiteTree from './components/SiteTree';
import { Layout, Network, ListTree, Filter, ImageDown, Loader2 } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
};

// Simplified FlowEditor just for display and minor layout tweaks (dragging)
const FlowEditor = ({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect, 
  onNodeClick,
  label
}: {
  nodes: Node[],
  edges: Edge[],
  onNodesChange?: OnNodesChange,
  onEdgesChange?: OnEdgesChange,
  onConnect?: (connection: Connection) => void,
  onNodeClick?: (event: React.MouseEvent, node: Node) => void,
  label: string
}) => (
  <div className="w-full h-full relative">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
    >
      <Background color="#f1f5f9" gap={16} />
      <Controls />
    </ReactFlow>
  </div>
);

export default function App() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [hasCrawled, setHasCrawled] = useState(false);
  const [isImportingImages, setIsImportingImages] = useState(false);
  
  // View Toggle
  const [visualMode, setVisualMode] = useState<'flow' | 'tree'>('flow');
  
  // Graph Filtering State
  const [hideEmptyRoots, setHideEmptyRoots] = useState(false);
  
  // Data States
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<SitePage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Crawl
  const handleCrawl = async (config: CrawlerConfig) => {
    setIsCrawling(true);
    try {
      const resultPages = await analyzeSiteStructure(config);
      setPages(resultPages);
      // Graph data update handled by useEffect below
      setTreeData(buildTreeFromPages(resultPages));
      setHasCrawled(true);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Laden der Struktur. Prüfen Sie die Konsole oder CORS-Einstellungen.");
    } finally {
      setIsCrawling(false);
    }
  };

  // Node Updates (Status, Notes)
  const handleNodeUpdate = (id: string, updates: Partial<SitePage>) => {
      // 1. Update Flat List (Source of Truth for Graph)
      const updatedPages = pages.map(p => p.id === id ? { ...p, ...updates } : p);
      setPages(updatedPages);

      // 2. Update Tree Structure (Source of Truth for TreeView)
      // We use a helper to update data without rebuilding the whole tree (preserving open states)
      const updatedTree = updateNodeDataInTree(treeData, id, updates);
      setTreeData(updatedTree);

      // 3. Update currently selected node if it matches
      if (selectedNodeData && selectedNodeData.id === id) {
          setSelectedNodeData({ ...selectedNodeData, ...updates });
      }
  };

  // ZIP Import Handler
  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingImages(true);
    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        const imageMap = new Map<string, string>();
        
        // Regex to match filename "123.png", "456.jpg" etc. where 123 is the ID
        const idPattern = /^(\d+)\.(png|jpg|jpeg|gif|webp)$/i;

        const promises: Promise<void>[] = [];

        content.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;

            const match = zipEntry.name.match(idPattern);
            if (match) {
                const id = match[1];
                const promise = zipEntry.async('blob').then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    imageMap.set(id, objectUrl);
                });
                promises.push(promise);
            }
        });

        await Promise.all(promises);

        if (imageMap.size === 0) {
            alert("Keine passenden Bilder gefunden. Dateinamen müssen die Page-ID enthalten (z.B. '1353.png').");
        } else {
            console.log(`Imported ${imageMap.size} images.`);
            
            // 1. Update global Pages state
            const updatedPages = pages.map(p => {
                if (imageMap.has(p.id)) {
                    return { ...p, thumbnailUrl: imageMap.get(p.id)! };
                }
                return p;
            });
            setPages(updatedPages);

            // 2. Update Tree Data (preserving open state)
            const updatedTree = updateTreeNodesImage(treeData, imageMap);
            setTreeData(updatedTree);

            // 3. Update Selected Node if it is currently open
            if (selectedNodeData && imageMap.has(selectedNodeData.id)) {
                setSelectedNodeData(prev => prev ? ({ ...prev, thumbnailUrl: imageMap.get(prev.id)! }) : null);
            }
            
            alert(`${imageMap.size} Screenshots erfolgreich importiert!`);
        }

    } catch (e) {
        console.error("ZIP Error", e);
        alert("Fehler beim Verarbeiten der ZIP-Datei.");
    } finally {
        setIsImportingImages(false);
        // Reset input
        if (event.target) event.target.value = '';
    }
  };

  // Effect to rebuild Graph when Pages change or Filter changes
  useEffect(() => {
    if (pages.length === 0) return;

    let filteredPages = pages;

    if (hideEmptyRoots) {
        // 1. Identify all pages that serve as parents
        const parentIds = new Set(pages.map(p => p.parentId).filter(Boolean));

        // 2. Filter: Keep page IF (it has a parent OR it is a parent)
        filteredPages = pages.filter(p => {
            const hasParent = !!p.parentId;
            const isParent = parentIds.has(p.id);
            
            // If it has no parent (Level 0) AND is not a parent itself (No children), exclude it.
            if (!hasParent && !isParent) {
                return false;
            }
            return true;
        });
    }

    setGraphData(buildGraphFromPages(filteredPages));
  }, [pages, hideEmptyRoots]);


  // Flow Handlers (Visual adjustments only)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setGraphData((nds) => ({ ...nds, nodes: applyNodeChanges(changes, nds.nodes) })),
    [setGraphData]
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setGraphData((nds) => ({ ...nds, edges: applyEdgeChanges(changes, nds.edges) })),
    [setGraphData]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setGraphData((nds) => ({ ...nds, edges: addEdge(connection, nds.edges) }));
    },
    [setGraphData]
  );

  // Tree Handlers (Structural Logic)
  const handleTreeChange = (newTree: TreeNode[]) => {
      setTreeData(newTree);
      
      // Sync structure to Pages and Graph
      // 1. Convert Tree back to flat list (updates parentIds)
      const flatPages = flattenTree(newTree);
      setPages(flatPages);
      // Graph update handled by useEffect
  };

  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as SitePage);
  };

  // Render Logic
  if (!hasCrawled) {
    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
             <SiteCrawler onCrawl={handleCrawl} isLoading={isCrawling} />
        </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept=".zip"
        className="hidden"
        onChange={handleZipUpload}
      />

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white">
                <Layout size={20} />
            </div>
            <div className="flex flex-col">
                <h1 className="font-bold text-lg hidden md:block leading-none">WP Structure Architect</h1>
                <span className="text-xs text-slate-400 font-medium">
                    {pages.length} Elemente
                </span>
            </div>
        </div>

        {/* Center: Visual Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
                onClick={() => setVisualMode('flow')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    visualMode === 'flow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <Network size={16} />
                Graph View
            </button>
            <button
                onClick={() => setVisualMode('tree')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    visualMode === 'tree' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <ListTree size={16} />
                Tree View
            </button>
        </div>

        <div className="w-auto flex justify-end gap-2">
            {/* Import Button */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImportingImages}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
                title="Lade eine ZIP-Datei mit Screenshots hoch (Dateiname = ID.png)"
            >
                {isImportingImages ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />}
                Screenshots importieren
            </button>

            {/* Filter Toggle (Only for Flow View) */}
            {visualMode === 'flow' && (
                <button
                    onClick={() => setHideEmptyRoots(!hideEmptyRoots)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                        hideEmptyRoots 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Zeigt nur Hauptseiten an, die Unterseiten besitzen"
                >
                    <Filter size={14} />
                    {hideEmptyRoots ? 'Leere Roots ausgeblendet' : 'Leere Roots ausblenden'}
                </button>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex overflow-hidden">
        
        {visualMode === 'flow' ? (
            <ReactFlowProvider>
                <FlowEditor 
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    label="Struktur Graph"
                />
            </ReactFlowProvider>
        ) : (
            <div className="w-full h-full max-w-4xl mx-auto border-x border-slate-200 bg-white shadow-sm">
                 <SiteTree
                    data={treeData}
                    readOnly={false}
                    onSelectNode={setSelectedNodeData}
                    onDataChange={handleTreeChange}
                    label="Struktur Baum"
                />
            </div>
        )}

        {/* Details Panel */}
        {selectedNodeData && (
            <NodeDetails 
                node={selectedNodeData} 
                onClose={() => setSelectedNodeData(null)}
                onUpdate={handleNodeUpdate}
            />
        )}
      </main>
    </div>
  );
}
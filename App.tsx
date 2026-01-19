import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { supabase, supabaseService } from './services/supabaseService';
import SiteCrawler from './components/SiteCrawler';
import CustomNode from './components/CustomNode';
import NodeDetails from './components/NodeDetails';
import SiteTree from './components/SiteTree';
import { Auth, LogoutButton } from './components/Auth';
import { ProjectManager } from './components/ProjectManager';
import { ProjectForm } from './components/ProjectForm';
import { Layout, Network, ListTree, Filter, ImageDown, Loader2, ArrowLeft } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
};

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
}) => {
  const handleNodesChange: OnNodesChange = (changes) => {
    if (onNodesChange) {
      onNodesChange(changes);
    }
  };

  const handleEdgesChange: OnEdgesChange = (changes) => {
    if (onEdgesChange) {
      onEdgesChange(changes);
    }
  };

  const handleConnect = (connection: Connection) => {
    if (onConnect) {
      onConnect(connection);
    }
  };

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange ? handleNodesChange : undefined}
        onEdgesChange={onEdgesChange ? handleEdgesChange : undefined}
        onConnect={onConnect ? handleConnect : undefined}
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
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [refreshProjects, setRefreshProjects] = useState(0);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [pages, setPages] = useState<SitePage[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<string>('');
  const [hasCrawled, setHasCrawled] = useState(false);
  const [isImportingImages, setIsImportingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [visualMode, setVisualMode] = useState<'flow' | 'tree'>('flow');
  const [hideEmptyRoots, setHideEmptyRoots] = useState(false);

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<SitePage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleNewProject = async (data: { title: string; url: string; description: string }) => {
    try {
      setCrawlStatus('Erstelle Projekt...');
      const project = await supabaseService.createProject(data.url, data.title, data.description);
      setCurrentProjectId(project.id);
      setProjectTitle(project.title);
      setShowProjectForm(false);

      setCrawlStatus('Starte Crawl...');
      await handleCrawl({
        url: data.url,
        includePages: true,
        includePosts: false,
        includeCustom: false,
      });

      setRefreshProjects(r => r + 1);
    } catch (err: any) {
      console.error('Create project error:', err);
      throw err;
    }
  };

  const handleCrawl = async (config: CrawlerConfig) => {
    setIsCrawling(true);
    setCrawlStatus('Starte Analyse...');
    try {
      const resultPages = await analyzeSiteStructure(config, (status) => {
        setCrawlStatus(status);
      });

      setPages(resultPages);
      setTreeData(buildTreeFromPages(resultPages));
      setHasCrawled(true);

      if (currentProjectId) {
        setCrawlStatus('Speichere Seiten in Datenbank...');
        await supabaseService.savePages(currentProjectId, resultPages);
        setCrawlStatus('Fertig!');
      }
    } catch (e) {
      console.error(e);
      alert("Fehler beim Laden der Struktur. Prüfen Sie die Konsole oder CORS-Einstellungen.");
    } finally {
      setIsCrawling(false);
      setTimeout(() => setCrawlStatus(''), 2000);
    }
  };


  const loadProjectFromDatabase = async (projectId: string) => {
    try {
      setIsCrawling(true);
      const project = await supabaseService.getProject(projectId);
      if (!project) throw new Error('Project not found');

      const loadedPages = await supabaseService.getPages(projectId);

      setCurrentProjectId(projectId);
      setProjectTitle(project.title);
      setPages(loadedPages);
      setTreeData(buildTreeFromPages(loadedPages));
      setHasCrawled(true);
    } catch (err: any) {
      console.error('Load error:', err);
      alert('Fehler beim Laden: ' + err.message);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleNodeUpdate = async (id: string, updates: Partial<SitePage>) => {
    const updatedPages = pages.map(p => p.id === id ? { ...p, ...updates } : p);
    setPages(updatedPages);

    const updatedTree = updateNodeDataInTree(treeData, id, updates);
    setTreeData(updatedTree);

    if (selectedNodeData && selectedNodeData.id === id) {
      setSelectedNodeData({ ...selectedNodeData, ...updates });
    }

    if (currentProjectId) {
      setIsSaving(true);
      try {
        await supabaseService.updatePageStatus(currentProjectId, id, updates.status || 'neutral', updates.notes);
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingImages(true);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      const imageMap = new Map<string, string>();

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
        const updatedPages = pages.map(p => {
          if (imageMap.has(p.id)) {
            return { ...p, thumbnailUrl: imageMap.get(p.id)! };
          }
          return p;
        });
        setPages(updatedPages);

        const updatedTree = updateTreeNodesImage(treeData, imageMap);
        setTreeData(updatedTree);

        if (selectedNodeData && imageMap.has(selectedNodeData.id)) {
          setSelectedNodeData(prev => prev ? ({ ...prev, thumbnailUrl: imageMap.get(prev.id)! }) : null);
        }

        alert(`${imageMap.size} Screenshots erfolgreich importiert!`);

        if (currentProjectId) {
          setIsSaving(true);
          try {
            for (const [id, url] of imageMap) {
              await supabaseService.updatePageThumbnail(currentProjectId, id, url);
            }
          } finally {
            setTimeout(() => setIsSaving(false), 500);
          }
        }
      }

    } catch (e) {
      console.error("ZIP Error", e);
      alert("Fehler beim Verarbeiten der ZIP-Datei.");
    } finally {
      setIsImportingImages(false);
      if (event.target) event.target.value = '';
    }
  };

  useEffect(() => {
    if (pages.length === 0) return;

    let filteredPages = pages;

    if (hideEmptyRoots) {
      const parentIds = new Set(pages.map(p => p.parentId).filter(Boolean));
      filteredPages = pages.filter(p => {
        const hasParent = !!p.parentId;
        const isParent = parentIds.has(p.id);
        if (!hasParent && !isParent) {
          return false;
        }
        return true;
      });
    }

    setGraphData(buildGraphFromPages(filteredPages));
  }, [pages, hideEmptyRoots]);

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

  const handleTreeChange = async (newTree: TreeNode[]) => {
    setTreeData(newTree);
    const flatPages = flattenTree(newTree);
    setPages(flatPages);

    if (currentProjectId) {
      setIsSaving(true);
      try {
        await supabaseService.savePages(currentProjectId, flatPages);
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }
  };

  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as SitePage);
  };

  const handleBackToProjects = () => {
    setCurrentProjectId(null);
    setHasCrawled(false);
    setPages([]);
    setProjectTitle('');
    setSelectedNodeData(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthStateChange={setUser} />;
  }

  if (!hasCrawled) {
    return (
      <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white">
              <Layout size={20} />
            </div>
            <h1 className="font-bold text-lg hidden md:block leading-none">WP Structure Architect</h1>
          </div>
          <LogoutButton />
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            {currentProjectId ? (
              <div className="space-y-6">
                <button
                  onClick={handleBackToProjects}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
                >
                  <ArrowLeft size={18} />
                  Zurück zu Projekten
                </button>
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <SiteCrawler onCrawl={handleCrawl} isLoading={isCrawling} />
                </div>
              </div>
            ) : (
              <>
                <ProjectManager
                  onProjectSelect={loadProjectFromDatabase}
                  onNewProject={() => setShowProjectForm(true)}
                  refreshTrigger={refreshProjects}
                />
                {showProjectForm && (
                  <ProjectForm
                    onSubmit={handleNewProject}
                    onCancel={() => setShowProjectForm(false)}
                  />
                )}
                {isCrawling && crawlStatus && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="text-lg font-medium text-slate-900">{crawlStatus}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        accept=".zip"
        className="hidden"
        onChange={handleZipUpload}
      />

      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToProjects}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            title="Zurück zu Projekten"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="bg-blue-600 p-2 rounded text-white">
            <Layout size={20} />
          </div>
          <div className="flex flex-col">
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={async () => {
                if (currentProjectId && projectTitle) {
                  setIsSaving(true);
                  try {
                    await supabaseService.updateProject(currentProjectId, { title: projectTitle });
                  } catch (err) {
                    console.error('Failed to update title:', err);
                  } finally {
                    setTimeout(() => setIsSaving(false), 500);
                  }
                }
              }}
              className="font-bold text-lg leading-none bg-transparent border-none outline-none text-slate-900"
              placeholder="Project Name"
            />
            <span className="text-xs text-slate-400 font-medium">
              {pages.length} Elemente
            </span>
          </div>
        </div>

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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImportingImages}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
            title="Lade eine ZIP-Datei mit Screenshots hoch"
          >
            {isImportingImages ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />}
            Screenshots
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500">
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span className="text-blue-600">Speichert...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Gespeichert</span>
              </>
            )}
          </div>

          {visualMode === 'flow' && (
            <button
              onClick={() => setHideEmptyRoots(!hideEmptyRoots)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                hideEmptyRoots
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              {hideEmptyRoots ? 'Leere Roots ausgeblendet' : 'Filter'}
            </button>
          )}

          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        {visualMode === 'flow' ? (
          <ReactFlowProvider>
            <FlowEditor
              nodes={graphData.nodes}
              edges={graphData.edges}
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
              projectId={currentProjectId || undefined}
            />
          </div>
        )}

        {selectedNodeData && (
          <NodeDetails
            node={selectedNodeData}
            onClose={() => setSelectedNodeData(null)}
            onUpdate={handleNodeUpdate}
            allPages={pages}
            projectId={currentProjectId || undefined}
          />
        )}
      </main>
    </div>
  );
}

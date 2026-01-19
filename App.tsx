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

import { buildGraphFromPages } from './utils/graphUtils';
import { buildTreeFromPages, flattenTree, TreeNode, updateTreeNodesImage, updateNodeDataInTree } from './utils/treeUtils';
import { exportUtils } from './utils/exportUtils';
import { SitePage, CrawlerConfig, GraphData, Actor, ProjectOwner } from './types';
import { analyzeSiteStructure } from './services/geminiService';
import { supabase, supabaseService } from './services/supabaseService';
import { sessionUtils } from './utils/session';
import SiteCrawler from './components/SiteCrawler';
import CustomNode from './components/CustomNode';
import NodeDetails from './components/NodeDetails';
import SiteTree from './components/SiteTree';
import { Auth, LogoutButton } from './components/Auth';
import { ProjectManager } from './components/ProjectManager';
import { ProjectForm } from './components/ProjectForm';
import { ProjectToolbar } from './components/ProjectToolbar';
import { ActivityFeed } from './components/ActivityFeed';
import { FilterPanel } from './components/FilterPanel';
import { Layout, Network, ListTree, Filter, Loader2, ArrowLeft, Download, Activity } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [visualMode, setVisualMode] = useState<'flow' | 'tree'>('flow');

  const [filters, setFilters] = useState({
    statuses: [] as PageStatus[],
    ownerIds: [] as string[],
    hideFiltered: false
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<SitePage | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [actor, setActor] = useState<Actor | null>(null);
  const [owners, setOwners] = useState<ProjectOwner[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          setActor(sessionUtils.createActorFromUser(
            currentUser.id,
            currentUser.email || 'User'
          ));
        }
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
      }, project.id);

      setRefreshProjects(r => r + 1);
    } catch (err: any) {
      console.error('Create project error:', err);
      throw err;
    }
  };

  const handleCrawl = async (config: CrawlerConfig, projectId?: string) => {
    setIsCrawling(true);
    setCrawlStatus('Starte Analyse...');
    try {
      const resultPages = await analyzeSiteStructure(config, (status) => {
        setCrawlStatus(status);
      });

      setPages(resultPages);
      setTreeData(buildTreeFromPages(resultPages));
      setHasCrawled(true);

      const targetProjectId = projectId || currentProjectId;
      if (targetProjectId) {
        setCrawlStatus('Speichere Seiten in Datenbank...');
        await supabaseService.savePages(targetProjectId, resultPages);
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
      const loadedOwners = await supabaseService.getProjectOwners(projectId);

      setCurrentProjectId(projectId);
      setProjectTitle(project.title);
      setPages(loadedPages);
      setTreeData(buildTreeFromPages(loadedPages));
      setOwners(loadedOwners);
      setHasCrawled(true);
    } catch (err: any) {
      console.error('Load error:', err);
      alert('Fehler beim Laden: ' + err.message);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleNodeUpdate = async (id: string, updates: Partial<SitePage>) => {
    const oldPage = pages.find(p => p.id === id);
    const updatedPages = pages.map(p => p.id === id ? { ...p, ...updates } : p);
    setPages(updatedPages);

    const updatedTree = updateNodeDataInTree(treeData, id, updates);
    setTreeData(updatedTree);

    if (currentProjectId && oldPage && actor) {
      try {
        if ('status' in updates && updates.status !== oldPage.status) {
          await supabaseService.updatePageStatus(currentProjectId, id, updates.status!, updates.notes, updates.mergeTargetId);
          await supabaseService.logActivity(currentProjectId, 'status_changed', actor, id, {
            oldStatus: oldPage.status,
            newStatus: updates.status,
          });
        }

        if ('mergeTargetId' in updates && updates.mergeTargetId !== oldPage.mergeTargetId) {
          await supabaseService.updatePageStatus(currentProjectId, id, updates.status || oldPage.status || 'neutral', updates.notes, updates.mergeTargetId);
        }

        if ('ownerId' in updates && updates.ownerId !== oldPage.ownerId) {
          await supabaseService.updatePageOwner(currentProjectId, id, updates.ownerId || null);
          await supabaseService.logActivity(currentProjectId, 'owner_changed', actor, id, {
            oldOwner: oldPage.ownerId,
            newOwner: updates.ownerId,
          });
        }

        if ('relevance' in updates && updates.relevance !== oldPage.relevance) {
          await supabaseService.updatePageRelevance(currentProjectId, id, updates.relevance!);
          await supabaseService.logActivity(currentProjectId, 'relevance_changed', actor, id, {
            oldRelevance: oldPage.relevance,
            newRelevance: updates.relevance,
          });
        }
      } catch (err) {
        console.error('Failed to log activity:', err);
      }
    }

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

  const isPageFiltered = (page: SitePage): boolean => {
    const hasFilters = filters.statuses.length > 0 || filters.ownerIds.length > 0;
    if (!hasFilters) return false;

    let matches = true;

    if (filters.statuses.length > 0) {
      matches = matches && filters.statuses.includes(page.status || 'neutral');
    }

    if (filters.ownerIds.length > 0) {
      matches = matches && (page.ownerId ? filters.ownerIds.includes(page.ownerId) : false);
    }

    return !matches;
  };

  const applyFiltersToPages = (pages: SitePage[]): SitePage[] => {
    if (filters.hideFiltered) {
      return pages.filter(page => !isPageFiltered(page));
    }
    return pages;
  };

  useEffect(() => {
    if (pages.length === 0) return;

    const filteredPages = applyFiltersToPages(pages);
    setGraphData(buildGraphFromPages(filteredPages));
  }, [pages, filters]);

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

  const loadThumbnailForPage = async (pageData: SitePage) => {
    if (currentProjectId && !pageData.thumbnailUrl) {
      const thumbnail = await supabaseService.getPageThumbnail(currentProjectId, pageData.id);
      if (thumbnail) {
        setSelectedNodeData(prev => prev?.id === pageData.id ? { ...prev, thumbnailUrl: thumbnail } : prev);
        setPages(prevPages => prevPages.map(p =>
          p.id === pageData.id ? { ...p, thumbnailUrl: thumbnail } : p
        ));
      }
    }
  };

  const handleNodeClick = async (e: React.MouseEvent, node: Node) => {
    const pageData = node.data as SitePage;
    setSelectedNodeData(pageData);
    loadThumbnailForPage(pageData);
  };

  const handleTreeNodeSelect = (pageData: SitePage | null) => {
    setSelectedNodeData(pageData);
    if (pageData) {
      loadThumbnailForPage(pageData);
    }
  };

  const handleBackToProjects = () => {
    setCurrentProjectId(null);
    setHasCrawled(false);
    setPages([]);
    setProjectTitle('');
    setSelectedNodeData(null);
  };

  const handleExportProject = async () => {
    if (!currentProjectId) return;

    setIsExporting(true);
    try {
      await exportUtils.exportProject(currentProjectId);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsExporting(false);
    }
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
                  currentUserId={user?.id}
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
          {currentProjectId && <ProjectToolbar projectId={currentProjectId} />}

          <button
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
              showActivityFeed
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Show activity feed"
          >
            <Activity size={14} />
            Activity
          </button>

          <button
            onClick={handleExportProject}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
            title="Projekt als JSON exportieren"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
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

          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
              showFilterPanel || (filters.statuses.length > 0 || filters.ownerIds.length > 0)
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            Filter
            {(filters.statuses.length > 0 || filters.ownerIds.length > 0) && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {filters.statuses.length + filters.ownerIds.length}
              </span>
            )}
          </button>

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
              onSelectNode={handleTreeNodeSelect}
              onDataChange={handleTreeChange}
              label="Struktur Baum"
              projectId={currentProjectId || undefined}
              owners={owners}
              isPageFiltered={isPageFiltered}
              hideFiltered={filters.hideFiltered}
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
            actor={actor || undefined}
          />
        )}

        {showFilterPanel && (
          <FilterPanel
            filters={filters}
            owners={owners}
            onFiltersChange={setFilters}
            onClose={() => setShowFilterPanel(false)}
          />
        )}

        {showActivityFeed && currentProjectId && (
          <ActivityFeed
            projectId={currentProjectId}
            pages={pages}
            onClose={() => setShowActivityFeed(false)}
          />
        )}
      </main>
    </div>
  );
}

import { SitePage, ContentType, CrawlerConfig } from "../types";

// Helper to strip HTML tags for summaries
const stripHtml = (html: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

// Helper to get Featured Image URL from embedded data
const getFeaturedImage = (item: any): string => {
  if (
    item._embedded &&
    item._embedded['wp:featuredmedia'] &&
    item._embedded['wp:featuredmedia'][0] &&
    item._embedded['wp:featuredmedia'][0].source_url
  ) {
    return item._embedded['wp:featuredmedia'][0].source_url;
  }
  return `https://picsum.photos/300/200?random=${item.id}`;
};

// Helper to resolve parent ID robustly (Handles 0, "0", null, undefined)
const resolveParentId = (rawParent: any): string | null => {
    if (!rawParent) return null; // Handles 0, null, undefined, false
    const str = String(rawParent);
    if (str === '0') return null; // Handles "0" string
    return str;
};

// Helper to check domain consistency (Excludes en.fme.de if crawling www.fme.de)
const isSameDomain = (itemUrl: string, baseUrl: string) => {
    try {
        if (!itemUrl || !baseUrl) return true;
        // Normalize hosts by removing www. to allow www.fme.de matching fme.de
        // But en.fme.de will NOT match fme.de
        const itemHost = new URL(itemUrl).hostname.replace(/^www\./, '');
        const baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
        return itemHost === baseHost;
    } catch (e) {
        return true; // Keep if URL parsing fails
    }
};

// Helper to create Basic Auth headers
const getAuthHeaders = (config: CrawlerConfig) => {
    if (config.username && config.appPassword) {
        const token = btoa(`${config.username}:${config.appPassword}`);
        return {
            'Authorization': `Basic ${token}`
        };
    }
    return {};
};

// Robust fetcher with Proxy fallbacks
const fetchWithFallback = async (url: string, config: CrawlerConfig): Promise<any> => {
    const headers = getAuthHeaders(config);
    const hasAuth = !!(config.username && config.appPassword);
    
    // Helper to safely parse JSON or throw
    const safeJson = async (res: Response, context: string) => {
        const text = await res.text();
        const trimmed = text.trim();
        
        // Explicit validation: Must start with { or [
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            const preview = trimmed.substring(0, 100).replace(/\n/g, ' ');
            throw new Error(`${context}: Received invalid JSON. Preview: "${preview}..."`);
        }
        
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`${context}: JSON Parse Error: ${e}`);
        }
    };

    // 1. Try Direct
    try {
        console.log(`🌐 [Direct] Fetching: ${url}`);
        const response = await fetch(url, { headers });
        if (response.ok) return await safeJson(response, "Direct");
        if (response.status === 401 || response.status === 403) {
             console.warn(`[Direct] Auth failed (401/403).`);
        }
    } catch (e) {
        console.warn(`[Direct] failed: ${e}`);
    }

    // 2. Try Proxy A (corsproxy.io)
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { headers });
        if (response.ok) return await safeJson(response, "Proxy A");
    } catch (e) {
        console.warn(`[Proxy A] failed: ${e}`);
    }

    if (hasAuth) {
        throw new Error("Verbindung fehlgeschlagen. Direct & Proxy A konnten nicht authentifizieren. Prüfen Sie CORS oder die Zugangsdaten.");
    }

    // 3. Try Proxy B (allorigins)
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await safeJson(response, "Proxy B");
    } catch (e) {
        console.warn(`[Proxy B] failed: ${e}`);
    }

    throw new Error(`Alle Verbindungsmethoden fehlgeschlagen für ${url}`);
};

// Helper to fetch all items with pagination
const fetchAllItems = async (baseUrl: string, endpoint: string, config: CrawlerConfig): Promise<any[]> => {
  let allItems: any[] = [];
  let page = 1;
  let hasMore = true;
  const MAX_PAGES = 30; 
  const PER_PAGE = 50; 

  while (hasMore && page <= MAX_PAGES) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${baseUrl}${endpoint}${separator}per_page=${PER_PAGE}&page=${page}&_embed`;
    
    try {
      const data = await fetchWithFallback(url, config);
      
      if (Array.isArray(data) && data.length > 0) {
        allItems = [...allItems, ...data];
        console.log(`📄 Page ${page} loaded: ${data.length} items.`);
        
        if (data.length < PER_PAGE) {
            hasMore = false;
        } else {
            page++;
        }
      } else {
        hasMore = false;
      }
    } catch (e: any) {
      console.warn(`Error fetching page ${page}:`, e);
      if (page === 1) throw e; 
      console.warn("Stopping pagination due to error on subsequent page.");
      hasMore = false; 
    }
  }

  return allItems;
};

// Helper to rescue a single missing parent
const rescueItem = async (baseUrl: string, id: string, config: CrawlerConfig): Promise<SitePage | null> => {
    try {
        // Try Pages first (most common parent)
        const url = `${baseUrl}/wp-json/wp/v2/pages/${id}?_embed`;
        const p = await fetchWithFallback(url, config);
        
        if (p && p.id) {
            return {
                id: String(p.id),
                title: p.title?.rendered || `Rescued Parent ${id}`,
                type: ContentType.PAGE,
                parentId: resolveParentId(p.parent),
                url: p.link,
                summary: stripHtml(p.excerpt?.rendered) || "Nachgeladenes Elternelement",
                thumbnailUrl: getFeaturedImage(p),
                menuOrder: p.menu_order || 0
            };
        }
    } catch (e) {
        // Silent fail - ghost will remain
    }
    return null;
};

// Recursive Flattening
const buildAndFlattenTree = (
  items: SitePage[], 
  parentId: string | null = null, 
  visited = new Set<string>()
): SitePage[] => {
    const children = items
        .filter(item => item.parentId === parentId)
        .sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0));

    let result: SitePage[] = [];

    for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);

        result.push(child);
        const grandChildren = buildAndFlattenTree(items, child.id, visited);
        result = [...result, ...grandChildren];
    }

    return result;
};

export const analyzeSiteStructure = async (config: CrawlerConfig): Promise<SitePage[]> => {
  console.group("🔍 START: Analyze Structure");
  const cleanUrl = config.url.replace(/\/$/, "");
  let allItems: SitePage[] = [];

  try {
    // 1. Fetch Pages
    if (config.includePages) {
        const pagesData = await fetchAllItems(cleanUrl, '/wp-json/wp/v2/pages', config);
        
        // Filter out items from other domains (WPML leakage)
        const filteredData = pagesData.filter((p: any) => isSameDomain(p.link, cleanUrl));
        console.log(`ℹ️ Filtered ${pagesData.length - filteredData.length} items from other domains.`);

        const mappedPages = filteredData.map((p: any) => ({
            id: String(p.id),
            title: p.title.rendered || "Ohne Titel",
            type: ContentType.PAGE,
            parentId: resolveParentId(p.parent),
            url: p.link,
            summary: stripHtml(p.excerpt.rendered) || stripHtml(p.content.rendered).substring(0, 150) + "...",
            thumbnailUrl: getFeaturedImage(p),
            menuOrder: p.menu_order || 0
        }));
        allItems = [...allItems, ...mappedPages];
    }

    // 2. Fetch Posts
    if (config.includePosts) {
        const postsData = await fetchAllItems(cleanUrl, '/wp-json/wp/v2/posts', config);
        
        // Filter posts as well
        const filteredPosts = postsData.filter((p: any) => isSameDomain(p.link, cleanUrl));

        if (filteredPosts.length > 0) {
            const blogPage = allItems.find(p => /blog|news|aktuelles/i.test(p.title));
            let blogParentId = blogPage ? blogPage.id : null;

            if (!blogParentId) {
                blogParentId = 'virtual-blog-root';
                allItems.push({
                    id: blogParentId,
                    title: 'Blog / Beiträge',
                    type: ContentType.CUSTOM,
                    parentId: null,
                    url: `${cleanUrl}/blog`,
                    summary: 'Automatisch erstellter Container',
                    thumbnailUrl: 'https://picsum.photos/300/200?grayscale',
                    menuOrder: 9999
                });
            }

            allItems = [...allItems, ...filteredPosts.map((p: any) => ({
                id: String(p.id),
                title: p.title.rendered || "Ohne Titel",
                type: ContentType.POST,
                parentId: blogParentId,
                url: p.link,
                summary: stripHtml(p.excerpt.rendered) || "...",
                thumbnailUrl: getFeaturedImage(p),
                menuOrder: 0
            }))];
        }
    }

    // 2.5 Rescue Missing Parents
    let rescueIterations = 0;
    let hasNewRescuedItems = true;

    while (hasNewRescuedItems && rescueIterations < 2) {
        rescueIterations++;
        hasNewRescuedItems = false;
        
        const existingIds = new Set(allItems.map(i => i.id));
        const missingParentIds = new Set<string>();

        allItems.forEach(item => {
            if (item.parentId && !existingIds.has(item.parentId)) {
                missingParentIds.add(item.parentId);
            }
        });

        if (missingParentIds.size > 0) {
            console.log(`🚑 Rescue Mode Iteration ${rescueIterations}: Found ${missingParentIds.size} missing parents. Fetching...`);
            
            const promises = Array.from(missingParentIds).map(id => rescueItem(cleanUrl, id, config));
            const rescuedResults = await Promise.all(promises);
            
            // Filter nulls AND foreign domains
            const validRescued = rescuedResults.filter((i): i is SitePage => {
                if (!i) return false;
                return isSameDomain(i.url, cleanUrl);
            });
            
            if (validRescued.length > 0) {
                console.log(`✅ Rescued ${validRescued.length} items!`);
                allItems = [...allItems, ...validRescued];
                hasNewRescuedItems = true; 
            }
        }
    }

    if (allItems.length === 0) throw new Error("Keine Inhalte gefunden. Prüfen Sie URL oder Authentifizierung.");

    // 3. Prune Orphans (Language Fallback Cleanup)
    // Instead of creating Ghosts, we assume that if a parent is STILL missing after rescue,
    // it implies the child is a language fallback artifact pointing to a parent in another language.
    // We prune these to keep the tree clean.
    const allIds = new Set(allItems.map(i => i.id));
    
    const validItems = allItems.filter(item => {
        // Root items are always valid
        if (!item.parentId) return true;
        
        // If parent exists in our dataset, it's valid
        if (allIds.has(item.parentId)) return true;

        // If parent is missing, we treat this as a language fallback artifact and hide it
        console.log(`🧹 Hiding item "${item.title}" (ID: ${item.id}) because parent ${item.parentId} cannot be found.`);
        return false;
    });

    console.log(`🌲 Flattening Tree... Kept ${validItems.length} of ${allItems.length} items.`);
    
    // Sort and flatten
    const sorted = buildAndFlattenTree(validItems, null);
    
    // Safety: Orphan handling (items that exist but became disconnected during flatten)
    // In strict pruning mode, this shouldn't happen often, but good for robustness
    const reachableIds = new Set(sorted.map(i => i.id));
    const orphans = validItems.filter(i => !reachableIds.has(i.id));
    
    if (orphans.length > 0) {
        console.warn(`Found ${orphans.length} unexpected orphans (circular refs?). Appending as roots.`);
        // Force them to be roots so they at least show up
        orphans.forEach(o => o.parentId = null);
        sorted.push(...orphans);
    }

    console.groupEnd();
    return sorted;

  } catch (error) {
    console.error("Analysis Failed:", error);
    console.groupEnd();
    throw error;
  }
};
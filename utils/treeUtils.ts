import { SitePage } from '../types';

export interface TreeNode extends SitePage {
  children?: TreeNode[];
  isOpen?: boolean;
}

/**
 * Transforms a flat list of SitePage objects into a nested structure required by react-arborist.
 */
export const buildTreeFromPages = (pages: SitePage[]): TreeNode[] => {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // 1. Create all nodes with empty children arrays
  pages.forEach(page => {
    // Explicitly set isOpen to false to ensure tree is collapsed by default
    nodeMap.set(page.id, { ...page, children: [], isOpen: false });
  });

  // 2. Assign children to parents
  pages.forEach(page => {
    const node = nodeMap.get(page.id);
    if (!node) return;

    // Fix Parent ID check (ensure we don't treat '0' string as parent)
    const safeParentId = (page.parentId === '0') ? null : page.parentId;

    if (safeParentId && nodeMap.has(safeParentId)) {
      const parent = nodeMap.get(safeParentId);
      parent?.children?.push(node);
    } else {
      roots.push(node);
    }
  });

  // 3. Recursive sort for children (by menuOrder)
  const sortChildrenByMenuOrder = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortChildrenByMenuOrder(node.children);
      }
    });
  };

  // Helper: Count all descendants recursively to determine the "weight" of a branch
  const getDescendantCount = (node: TreeNode): number => {
    if (!node.children || node.children.length === 0) return 0;
    return node.children.reduce((acc, child) => acc + 1 + getDescendantCount(child), 0);
  };

  // Apply Sorts
  
  // A) Sort deep levels by standard WP Menu Order
  sortChildrenByMenuOrder(roots);

  // B) Sort Root Level (Level 0) by total number of subpages (descendants) descending
  roots.sort((a, b) => {
    const countA = getDescendantCount(a);
    const countB = getDescendantCount(b);
    return countB - countA; // Most subpages first
  });

  return roots;
};

/**
 * Recursively updates the thumbnailUrl for nodes in the tree based on a map of ID -> URL.
 * Creates a new tree structure to ensure immutability.
 */
export const updateTreeNodesImage = (nodes: TreeNode[], imageMap: Map<string, string>): TreeNode[] => {
    return nodes.map(node => {
        const newNode = { ...node };
        
        // Update image if found in map
        if (imageMap.has(node.id)) {
            newNode.thumbnailUrl = imageMap.get(node.id)!;
        }

        // Recursively update children
        if (newNode.children && newNode.children.length > 0) {
            newNode.children = updateTreeNodesImage(newNode.children, imageMap);
        }

        return newNode;
    });
};

/**
 * Updates specific data fields of a node within the tree without destroying the structure/state.
 */
export const updateNodeDataInTree = (nodes: TreeNode[], nodeId: string, updates: Partial<SitePage>): TreeNode[] => {
    return nodes.map(node => {
        if (node.id === nodeId) {
            return { ...node, ...updates };
        }
        
        if (node.children && node.children.length > 0) {
            return { 
                ...node, 
                children: updateNodeDataInTree(node.children, nodeId, updates) 
            };
        }
        
        return node;
    });
};

/**
 * flattens the tree back to SitePage[] updating parentIds based on new structure
 */
export const flattenTree = (nodes: TreeNode[], parentId: string | null = null): SitePage[] => {
  let flat: SitePage[] = [];
  
  nodes.forEach((node, index) => {
    const { children, ...pageData } = node;
    
    // Update structural data
    const updatedPage: SitePage = {
      ...pageData,
      parentId: parentId,
      menuOrder: index
    };
    
    flat.push(updatedPage);
    
    if (children && children.length > 0) {
      flat = [...flat, ...flattenTree(children, node.id)];
    }
  });
  
  return flat;
};

/**
 * Handles the logic for moving a node within the tree structure.
 * Returns a new tree array.
 */
export const moveTreeNode = (data: TreeNode[], dragIds: string[], parentId: string | null, index: number): TreeNode[] => {
    // Deep copy to avoid mutating state directly during calculation
    const newData = JSON.parse(JSON.stringify(data));
    let draggedNode: TreeNode | null = null;
    const dragId = dragIds[0]; // Assuming single selection for now

    // 1. Find and Remove Node from old position
    const removeNode = (nodes: TreeNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === dragId) {
                draggedNode = nodes[i];
                nodes.splice(i, 1);
                return true;
            }
            if (nodes[i].children && nodes[i].children.length > 0) {
                if (removeNode(nodes[i].children!)) return true;
            }
        }
        return false;
    }

    removeNode(newData);

    if (!draggedNode) return data; 

    // Update internal parentId for consistency (though nesting defines it visually)
    (draggedNode as any).parentId = parentId;

    // 2. Insert Node at new position
    if (parentId === null) {
        // Insert at root level
        newData.splice(index, 0, draggedNode);
    } else {
        const insertIntoParent = (nodes: TreeNode[]): boolean => {
             for (let node of nodes) {
                 if (node.id === parentId) {
                     if (!node.children) node.children = [];
                     node.children.splice(index, 0, draggedNode!);
                     return true;
                 }
                 if (node.children && insertIntoParent(node.children)) return true;
             }
             return false;
        }
        insertIntoParent(newData);
    }

    return newData;
};
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position
} from 'react-flow-renderer';

// ✅ Define nodeTypes outside the component
const nodeTypes = {
    // Invisible midpoint connector node for parent couples (no visual dot, but handles work)
    midpointNode: () => (
      <div style={{ 
        width: 1, 
        height: 1,
        opacity: 0
      }}>
        <Handle type="target" position={Position.Left} id="target-left" style={{ width: 10, height: 10, background: '#667eea', opacity: 1 }} />
        <Handle type="target" position={Position.Right} id="target-right" style={{ width: 10, height: 10, background: '#667eea', opacity: 1 }} />
        <Handle type="source" position={Position.Bottom} style={{ width: 10, height: 10, background: '#667eea', opacity: 1 }} />
      </div>
    ),
    memberNode: ({ data }) => (
      <div style={{ 
        padding: '12px', 
        border: '1.5px solid #e2e8f0', 
        borderRadius: 12, 
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        minWidth: 180,
        textAlign: 'center',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        e.currentTarget.style.borderColor = '#cbd5e0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
      >
        {/* Top handle for parent connections */}
        <Handle type="target" position={Position.Top} style={{ background: '#4a5568', width: 10, height: 10, border: '2px solid #fff' }} />
        
        {/* Left handle for spouse connections */}
        <Handle type="source" position={Position.Left} id="spouse-left" style={{ background: '#d97706', width: 10, height: 10, border: '2px solid #fff' }} />
        <Handle type="target" position={Position.Left} id="spouse-left-target" style={{ background: '#d97706', width: 10, height: 10, border: '2px solid #fff' }} />
        
        {/* Right handle for spouse connections */}
        <Handle type="source" position={Position.Right} id="spouse-right" style={{ background: '#d97706', width: 10, height: 10, border: '2px solid #fff' }} />
        <Handle type="target" position={Position.Right} id="spouse-right-target" style={{ background: '#d97706', width: 10, height: 10, border: '2px solid #fff' }} />
        
        <div 
          onClick={() => data.onEditClick(data.id)}
          style={{ cursor: 'pointer' }}
        >
          {data.photo_url ? (
            <img 
              src={data.photo_url} 
              alt={data.label}
              style={{
                width: '100%',
                height: 120,
                objectFit: 'contain',
                objectPosition: data.photo_position || '50% 50%',
                borderRadius: 8,
                marginBottom: 8,
                background: '#edf2f7'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: 120,
              background: '#edf2f7',
              borderRadius: 8,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0aec0',
              fontSize: 12,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#718096';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#edf2f7';
              e.currentTarget.style.color = '#a0aec0';
            }}
            >
              Click to add photo
            </div>
          )}
          <div style={{ 
            fontSize: 14, 
            marginBottom: 8, 
            color: '#1a202c',
            fontWeight: 500
          }}>
            {data.label}
          </div>
        </div>
        <button 
          onClick={() => data.onAddClick(data.id)} 
          style={{ 
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            background: '#1a202c',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2d3748';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1a202c';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          +
        </button>
        
        {/* Bottom handle for child connections */}
        <Handle type="source" position={Position.Bottom} style={{ background: '#4a5568', width: 10, height: 10, border: '2px solid #fff' }} />
      </div>
    ),
  };

const TreeViewContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showForm, setShowForm] = useState(false);
  const [relationType, setRelationType] = useState(null);
  const [targetNodeId, setTargetNodeId] = useState(null);
  const [targetPersonInfo, setTargetPersonInfo] = useState(null);
  const [pendingRelationType, setPendingRelationType] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedExistingMember, setSelectedExistingMember] = useState(null);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [treeName, setTreeName] = useState('My Family Tree');
  const [isEditingTreeName, setIsEditingTreeName] = useState(false);
  const [tempTreeName, setTempTreeName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    photo_url: null,
    photo_position: '50% 50%', // Default center position
  });
  const reactFlowInstance = useRef(null);

  // Tree layout constants
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 300; // Increased spacing between generations to move parents higher

  const calculateTreeLayout = (members) => {
    // Build children map (parent_id -> [children])
    const childrenMap = new Map();
    members.forEach(member => {
      if (Array.isArray(member.parent_ids)) {
        member.parent_ids.forEach(pid => {
          if (pid != null) {
            if (!childrenMap.has(pid)) {
              childrenMap.set(pid, []);
            }
            childrenMap.get(pid).push(member.id);
          }
        });
      }
    });

    // Build spouse map (bidirectional)
    const spouseMap = new Map();
    members.forEach(member => {
      if (member.spouse_id != null) {
        spouseMap.set(member.id, member.spouse_id);
      }
    });

    // Build parent couple map (for children of couples)
    // Maps a couple key (sorted parent IDs) to ALL their children
    // This includes children with both parents AND children with just one parent if that parent has a spouse
    const parentCoupleChildrenMap = new Map();
    
    // First, find all couples (spouses)
    const couples = new Set();
    members.forEach(member => {
      if (member.spouse_id != null) {
        const coupleKey = [member.id, member.spouse_id].sort((a, b) => a - b).join('-');
        couples.add(coupleKey);
      }
    });
    
    // Then, for each couple, find ALL their children
    couples.forEach(coupleKey => {
      const [parent1Id, parent2Id] = coupleKey.split('-').map(Number);
      const coupleChildren = [];
      
      members.forEach(member => {
        if (Array.isArray(member.parent_ids)) {
          // Include children with both parents
          if (member.parent_ids.length >= 2 && 
              member.parent_ids.includes(parent1Id) && 
              member.parent_ids.includes(parent2Id)) {
            coupleChildren.push(member.id);
          }
          // Also include children with just one parent if that parent is part of this couple
          else if (member.parent_ids.length === 1 && 
                   (member.parent_ids[0] === parent1Id || member.parent_ids[0] === parent2Id)) {
            coupleChildren.push(member.id);
          }
        }
      });
      
      if (coupleChildren.length > 0) {
        parentCoupleChildrenMap.set(coupleKey, coupleChildren);
      }
    });

    // Find root nodes (nodes with no parents or empty parent_ids)
    // But exclude nodes that are spouses of root nodes (they'll be positioned with their spouse)
    const rootNodes = members.filter(m => {
      if (m.parent_ids && m.parent_ids.length > 0) return false;
      // If this node has a spouse that is also a root, only include the one with smaller ID
      if (m.spouse_id != null) {
        const spouse = members.find(s => s.id === m.spouse_id);
        if (spouse && (!spouse.parent_ids || spouse.parent_ids.length === 0)) {
          return m.id < spouse.id; // Only include the one with smaller ID
        }
      }
      return true;
    });
    
    // Sort root nodes: single-child roots first (parents added to existing roots)
    // then other roots
    rootNodes.sort((a, b) => {
      const aChildren = childrenMap.get(a.id) || [];
      const bChildren = childrenMap.get(b.id) || [];
      const aIsSingleChild = aChildren.length === 1;
      const bIsSingleChild = bChildren.length === 1;
      if (aIsSingleChild && !bIsSingleChild) return -1;
      if (!aIsSingleChild && bIsSingleChild) return 1;
      return 0;
    });

    const positions = new Map();
    const subtreeWidths = new Map();

    // Calculate subtree width recursively (including spouse if present)
    const calculateSubtreeWidth = (nodeId) => {
      if (subtreeWidths.has(nodeId)) {
        return subtreeWidths.get(nodeId);
      }

      const children = childrenMap.get(nodeId) || [];
      const spouseId = spouseMap.get(nodeId);
      
      let childrenWidth = 0;
      if (children.length > 0) {
        children.forEach(childId => {
          childrenWidth += calculateSubtreeWidth(childId);
        });
      } else {
        childrenWidth = HORIZONTAL_SPACING;
      }

      // If there's a spouse, add space for them
      // Always account for spouse width, even if already positioned
      let spouseWidth = 0;
      if (spouseId != null) {
        // Check if spouse has children
        const spouseChildren = childrenMap.get(spouseId) || [];
        if (spouseChildren.length > 0) {
          spouseChildren.forEach(childId => {
            spouseWidth += calculateSubtreeWidth(childId);
          });
        } else {
          spouseWidth = HORIZONTAL_SPACING;
        }
        spouseWidth += 100; // Space between spouses
      }

      const width = Math.max(childrenWidth + spouseWidth, HORIZONTAL_SPACING);
      subtreeWidths.set(nodeId, width);
      return width;
    };

    // Assign positions using hierarchical layout
    const assignPositions = (nodeId, startX, y) => {
      const children = childrenMap.get(nodeId) || [];
      const spouseId = spouseMap.get(nodeId);
      
      // Check if this node is a child (has parents)
      const member = members.find(m => m.id === nodeId);
      const isChild = member && member.parent_ids && member.parent_ids.length > 0;
      
      // If node is already positioned and has no spouse, don't reposition
      if (positions.has(nodeId) && spouseId == null) {
        return positions.get(nodeId).x;
      }
      
      // If node is already positioned as a CHILD and gets a spouse, 
      // just position the spouse next to it at the same Y level - don't move the child
      if (positions.has(nodeId) && spouseId != null && isChild && !positions.has(spouseId)) {
        const existingPos = positions.get(nodeId);
        if (nodeId < spouseId) {
          positions.set(spouseId, { x: existingPos.x + 200, y: existingPos.y });
        } else {
          positions.set(spouseId, { x: existingPos.x - 200, y: existingPos.y });
        }
        return existingPos.x;
      }
      
      // If both node and spouse are already positioned, don't reposition
      if (positions.has(nodeId) && spouseId != null && positions.has(spouseId)) {
        return positions.get(nodeId).x;
      }
      
      // Get all children, but exclude children that belong to parent couples
      // (those will be positioned separately below the couple's midpoint)
      const allChildren = new Set();
      const coupleKey = spouseId ? [nodeId, spouseId].sort((a, b) => a - b).join('-') : null;
      const coupleChildren = coupleKey ? parentCoupleChildrenMap.get(coupleKey) || [] : [];
      
      // Add children that don't belong to the couple
      children.forEach(childId => {
        if (!coupleChildren.includes(childId)) {
          allChildren.add(childId);
        }
      });
      
      if (spouseId != null) {
        const spouseChildren = childrenMap.get(spouseId) || [];
        spouseChildren.forEach(childId => {
          if (!coupleChildren.includes(childId)) {
            allChildren.add(childId);
          }
        });
      }

      // Position children first and track their center positions
      let currentX = startX;
      const childCenters = [];
      const childrenArray = Array.from(allChildren);
      
      if (allChildren.size > 0) {
        childrenArray.forEach((childId, index) => {
          // Always recalculate child positions to ensure they're properly positioned
          const childStartX = currentX;
          assignPositions(childId, childStartX, y + VERTICAL_SPACING);
          const childWidth = calculateSubtreeWidth(childId);
          // Calculate the center of this child's subtree
          const childPos = positions.get(childId);
          const childCenterX = childPos ? childPos.x + childWidth / 2 : childStartX + childWidth / 2;
          childCenters.push(childCenterX);
          currentX += childWidth;
          // Add spacing between siblings (except for the last one)
          if (index < childrenArray.length - 1) {
            currentX += 50; // 50px spacing between siblings
          }
        });
      }

      // Position this node and spouse
      let nodeX = startX;
      let spouseX = null;
      
      // IMPORTANT: If this node is a CHILD (has parents), preserve its Y level
      // Don't let it move up when centering above its own children
      const preserveY = isChild && positions.has(nodeId) ? positions.get(nodeId).y : y;
      
      if (allChildren.size > 0 && childCenters.length > 0) {
        // Center couple above children
        const minChildCenter = Math.min(...childCenters);
        const maxChildCenter = Math.max(...childCenters);
        const centerX = (minChildCenter + maxChildCenter) / 2;
        
        if (spouseId != null) {
          // Always reposition both spouses to be centered above children
          // Determine which is left and which is right based on their IDs for consistency
          if (nodeId < spouseId) {
            nodeX = centerX - 100; // Left spouse
            spouseX = centerX + 100; // Right spouse
          } else {
            nodeX = centerX + 100; // Right spouse
            spouseX = centerX - 100; // Left spouse
          }
          // Use preserved Y if this is a child, otherwise use the passed y
          positions.set(spouseId, { x: spouseX, y: preserveY });
        } else {
          nodeX = centerX;
        }
      } else if (spouseId != null) {
        // No children, position spouses side by side at the SAME Y level
        // If one is already positioned, we need to position the other at the same Y
        const existingNodePos = positions.get(nodeId);
        const existingSpousePos = positions.get(spouseId);
        
        if (existingNodePos && !existingSpousePos) {
          // Node is positioned, spouse is not - position spouse at same Y as node
          if (nodeId < spouseId) {
            spouseX = existingNodePos.x + 200;
          } else {
            spouseX = existingNodePos.x - 200;
          }
          positions.set(spouseId, { x: spouseX, y: existingNodePos.y }); // Use node's Y
          nodeX = existingNodePos.x; // Keep node position
        } else if (existingSpousePos && !existingNodePos) {
          // Spouse is positioned, node is not - position node at same Y as spouse
          if (nodeId < spouseId) {
            nodeX = existingSpousePos.x - 200;
          } else {
            nodeX = existingSpousePos.x + 200;
          }
          spouseX = existingSpousePos.x; // Keep spouse position
          // Use spouse's Y for node
          y = existingSpousePos.y;
        } else if (existingNodePos && existingSpousePos) {
          // Both already positioned - keep their X positions but ensure they're at same Y
          // Use the Y of whichever was positioned first (or node's Y)
          const sameY = existingNodePos.y;
          nodeX = existingNodePos.x;
          spouseX = existingSpousePos.x;
          // Update spouse Y to match node Y if different
          if (existingSpousePos.y !== sameY) {
            positions.set(spouseId, { x: spouseX, y: sameY });
          }
        } else {
          // Neither positioned, use startX and current y
          if (nodeId < spouseId) {
            nodeX = startX;
            spouseX = startX + 200;
          } else {
            nodeX = startX + 200;
            spouseX = startX;
          }
          positions.set(spouseId, { x: spouseX, y });
        }
      }

      // Use preserved Y if this is a child, otherwise use the passed y
      positions.set(nodeId, { x: nodeX, y: preserveY });
      
      // Return the rightmost position used
      const rightmost = Math.max(
        currentX,
        spouseX != null ? spouseX + 150 : nodeX + HORIZONTAL_SPACING
      );
      return rightmost;
    };

    // Process each root node
    let currentRootX = 100;
    rootNodes.forEach(root => {
      const children = childrenMap.get(root.id) || [];
      const spouseId = spouseMap.get(root.id);
      
      // Check if this root has exactly one child
      // This typically means a parent was added to an existing root node
      if (children.length === 1) {
        const childId = children[0];
        const child = members.find(m => m.id === childId);
        
        // If child has only this parent, position parent above child
        if (child && child.parent_ids && child.parent_ids.length === 1 && child.parent_ids[0] === root.id) {
          // First, position the child's entire subtree to get its center
          const childWidth = calculateSubtreeWidth(childId);
          // Use a temporary X to position the child, then we'll center the parent above it
          const tempChildX = currentRootX;
          assignPositions(childId, tempChildX, 50 + VERTICAL_SPACING);
          
          // Get the child's actual position after positioning its subtree
          const childPos = positions.get(childId);
          if (childPos) {
            // Calculate the center of the child's subtree (including spouse if present)
            const childSpouseId = spouseMap.get(childId);
            let childCenterX;
            if (childSpouseId) {
              const childSpousePos = positions.get(childSpouseId);
              if (childSpousePos) {
                // Center between child and spouse
                const leftX = Math.min(childPos.x, childSpousePos.x);
                const rightX = Math.max(childPos.x, childSpousePos.x);
                childCenterX = (leftX + rightX) / 2;
              } else {
                childCenterX = childPos.x + childWidth / 2;
              }
            } else {
              childCenterX = childPos.x + childWidth / 2;
            }
            
            // Position parent centered above child (and spouse if present)
            positions.set(root.id, { x: childCenterX, y: 50 });
            
            // Adjust child and all descendants to be centered under parent
            const offsetX = childCenterX - childPos.x;
            const adjustSubtree = (nodeId, offset) => {
              const pos = positions.get(nodeId);
              if (pos) {
                positions.set(nodeId, { x: pos.x + offset, y: pos.y });
                const nodeChildren = childrenMap.get(nodeId) || [];
                nodeChildren.forEach(cid => adjustSubtree(cid, offset));
                const nodeSpouseId = spouseMap.get(nodeId);
                if (nodeSpouseId) {
                  const spousePos = positions.get(nodeSpouseId);
                  if (spousePos) {
                    positions.set(nodeSpouseId, { x: spousePos.x + offset, y: spousePos.y });
                  }
                }
              }
            };
            adjustSubtree(childId, offsetX);
            
            currentRootX += childWidth + HORIZONTAL_SPACING;
          } else {
            // Fallback: normal root processing
            const width = calculateSubtreeWidth(root.id);
            assignPositions(root.id, currentRootX, 50);
            currentRootX += width + HORIZONTAL_SPACING;
          }
        } else {
          // Normal root processing
          const width = calculateSubtreeWidth(root.id);
          assignPositions(root.id, currentRootX, 50);
          currentRootX += width + HORIZONTAL_SPACING;
        }
      } else {
        // Normal root node processing (multiple children or has spouse)
        const width = calculateSubtreeWidth(root.id);
        assignPositions(root.id, currentRootX, 50); // Start at top
        currentRootX += width + HORIZONTAL_SPACING;
      }
    });

    // Second pass: Position couple's shared children below their midpoint
    parentCoupleChildrenMap.forEach((children, coupleKey) => {
      const [parent1Id, parent2Id] = coupleKey.split('-').map(Number);
      const parent1Pos = positions.get(parent1Id);
      const parent2Pos = positions.get(parent2Id);
      
      if (parent1Pos && parent2Pos && children.length > 0) {
        // Calculate couple's midpoint
        const coupleCenterX = (parent1Pos.x + parent2Pos.x) / 2;
        const coupleY = Math.max(parent1Pos.y, parent2Pos.y);
        
        // Calculate total width needed for all children (using actual subtree widths)
        let totalChildrenWidth = 0;
        const childWidths = [];
        children.forEach((childId) => {
          const childWidth = calculateSubtreeWidth(childId);
          childWidths.push({ id: childId, width: childWidth });
          totalChildrenWidth += childWidth;
        });
        
        // Add spacing between siblings
        const siblingSpacing = 50;
        totalChildrenWidth += (children.length - 1) * siblingSpacing;
        
        // Start positioning children centered below couple
        let currentX = coupleCenterX - totalChildrenWidth / 2;
        
        children.forEach((childInfo, index) => {
          const childId = childInfo.id || childInfo; // Handle both object and ID
          const childWidth = childInfo.width || calculateSubtreeWidth(childId);
          
          // Store the intended Y level for this child before removing it
          const childY = coupleY + VERTICAL_SPACING;
          
          // Remove child from positions if it was positioned incorrectly
          // But preserve the intended Y level by setting it first
          if (positions.has(childId)) {
            const oldPos = positions.get(childId);
            // If the old position is at a different Y level, we need to reposition
            // But if it's already at the child level, we can keep it
            if (Math.abs(oldPos.y - childY) > 10) {
              positions.delete(childId);
            }
          }
          
          // Position child's subtree starting at currentX
          const subtreeStartX = currentX;
          assignPositions(childId, subtreeStartX, childY);
          
          // Get the child's current position after positioning its subtree
          const childPos = positions.get(childId);
          if (childPos) {
            // Calculate the center of the child's subtree
            const childCenterX = subtreeStartX + childWidth / 2;
            
            // Calculate offset to center the child node at the center of its subtree
            const offsetX = childCenterX - childPos.x;
            
            // Adjust this child and all its descendants
            const adjustSubtree = (nodeId, offset) => {
              const pos = positions.get(nodeId);
              if (pos) {
                // Keep the Y coordinate - don't change it for children
                positions.set(nodeId, { x: pos.x + offset, y: pos.y });
                // Adjust all children of this node
                const nodeChildren = childrenMap.get(nodeId) || [];
                nodeChildren.forEach(cid => adjustSubtree(cid, offset));
                // Also adjust spouse if present - ensure same Y level
                const spouseId = spouseMap.get(nodeId);
                if (spouseId) {
                  const spousePos = positions.get(spouseId);
                  if (spousePos) {
                    // Keep spouse at same Y as node
                    positions.set(spouseId, { x: spousePos.x + offset, y: pos.y });
                  } else {
                    // Spouse not positioned yet - position it now at same Y as node
                    const nodePos = positions.get(nodeId);
                    if (nodePos) {
                      if (nodeId < spouseId) {
                        positions.set(spouseId, { x: nodePos.x + 200, y: nodePos.y });
                      } else {
                        positions.set(spouseId, { x: nodePos.x - 200, y: nodePos.y });
                      }
                    }
                  }
                }
              }
            };
            
            adjustSubtree(childId, offsetX);
          }
          
          // Move to next child position
          currentX += childWidth;
          if (index < children.length - 1) {
            currentX += siblingSpacing;
          }
        });
      }
    });

    // Handle orphaned nodes (nodes that should have parents but don't exist in tree)
    // But skip nodes that are root nodes (they should already be positioned)
    members.forEach(member => {
      if (!positions.has(member.id)) {
        // Check if this is a root node - if so, it should have been positioned already
        const isRoot = !member.parent_ids || member.parent_ids.length === 0;
        if (!isRoot) {
          // Place orphaned nodes to the right
          const existingX = Array.from(positions.values()).map(p => p.x);
          const maxX = existingX.length > 0 ? Math.max(...existingX) : 0;
          positions.set(member.id, { 
            x: maxX + HORIZONTAL_SPACING, 
            y: 100 
          });
        }
      }
    });

    return { positions, parentCoupleChildrenMap };
  };

  const handleEditClick = async (nodeId) => {
    setTargetNodeId(nodeId);
    setRelationType('edit');
    try {
      const res = await axios.get('http://localhost:8000/members');
      const person = res.data.find((m) => m.id === parseInt(nodeId));
      setTargetPersonInfo(person);
      setFormData({
        name: person.name || '',
        date_of_birth: person.date_of_birth || '',
        photo_url: person.photo_url || null,
        photo_position: person.photo_position || '50% 50%',
      });
      setShowForm(true);
    } catch (err) {
      console.error('Error fetching person info:', err);
    }
  };

  const fetchTreeName = () => {
    axios.get('http://localhost:8000/tree-name').then((res) => {
      setTreeName(res.data.name);
    }).catch(() => {
      // If endpoint doesn't exist yet, use default
      setTreeName('My Family Tree');
    });
  };

  const updateTreeName = async (newName) => {
    try {
      await axios.put('http://localhost:8000/tree-name', { name: newName });
      setTreeName(newName);
      setIsEditingTreeName(false);
    } catch (error) {
      console.error('Failed to update tree name:', error);
      alert('Failed to update tree name');
    }
  };

  const fetchMembers = () => {
    axios.get('http://localhost:8000/members').then((res) => {
      const members = res.data;
      setAllMembers(members); // Store all members for search/selection

      if (members.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      // Calculate positions using tree layout
      const { positions, parentCoupleChildrenMap } = calculateTreeLayout(members);

      const generatedNodes = members.map((member) => {
        const pos = positions.get(member.id) || { x: 100, y: 50 };
        return {
          id: String(member.id),
          type: 'memberNode',
          position: pos,
          data: {
            label: member.name,
            id: member.id,
            photo_url: member.photo_url,
            photo_position: member.photo_position,
            onAddClick: handleAddClick,
            onEditClick: handleEditClick,
          },
        };
      });

      const generatedEdges = [];
      const spouseEdgesAdded = new Set();
      const parentCoupleNodes = new Map(); // Map of parent couple IDs to midpoint node IDs
      const midpointNodes = []; // Array to store invisible midpoint nodes
      
      // First pass: Create midpoint nodes for all parent couples (even if children have only one parent)
      parentCoupleChildrenMap.forEach((children, coupleKey) => {
        if (!parentCoupleNodes.has(coupleKey) && children.length > 0) {
          const [parent1Id, parent2Id] = coupleKey.split('-').map(Number);
          const pos1 = positions.get(parent1Id);
          const pos2 = positions.get(parent2Id);
          
          if (pos1 && pos2) {
            const midpointId = `midpoint-${coupleKey}`;
            const midpointX = (pos1.x + pos2.x) / 2;
            const midpointY = Math.max(pos1.y, pos2.y);
            
            midpointNodes.push({
              id: midpointId,
              type: 'midpointNode',
              position: { x: midpointX, y: midpointY },
              data: { label: '' },
              draggable: false,
              selectable: false
            });
            
            parentCoupleNodes.set(coupleKey, midpointId);
          }
        }
      });
      
      // First, create parent-to-midpoint edges for all couples
      parentCoupleNodes.forEach((midpointId, coupleKey) => {
        const [parent1Id, parent2Id] = coupleKey.split('-').map(Number);
        const pos1 = positions.get(parent1Id);
        const pos2 = positions.get(parent2Id);
        
        if (pos1 && pos2) {
          // Determine left and right parent
          let leftParentId, rightParentId;
          if (pos1.x < pos2.x) {
            leftParentId = String(parent1Id);
            rightParentId = String(parent2Id);
          } else {
            leftParentId = String(parent2Id);
            rightParentId = String(parent1Id);
          }
          
          // Connect left parent to midpoint (from right side of parent)
          const leftEdgeId = `e-parent-midpoint-${leftParentId}-${coupleKey}`;
          if (!generatedEdges.find(e => e.id === leftEdgeId)) {
            generatedEdges.push({
              id: leftEdgeId,
              source: leftParentId,
              sourceHandle: 'spouse-right',
              target: midpointId,
              targetHandle: 'target-left',
              type: 'straight',
              style: { stroke: '#4a5568', strokeWidth: 2 },
              animated: false,
            });
          }
          
          // Connect right parent to midpoint (from left side of parent)
          const rightEdgeId = `e-parent-midpoint-${rightParentId}-${coupleKey}`;
          if (!generatedEdges.find(e => e.id === rightEdgeId)) {
            generatedEdges.push({
              id: rightEdgeId,
              source: rightParentId,
              sourceHandle: 'spouse-left',
              target: midpointId,
              targetHandle: 'target-right',
              type: 'straight',
              style: { stroke: '#4a5568', strokeWidth: 2 },
              animated: false,
            });
          }
        }
      });
      
      members.forEach((member) => {
        // Parent-child edges
        if (Array.isArray(member.parent_ids)) {
          if (member.parent_ids.length >= 2) {
            // Child has multiple parents - check if we have a midpoint node
            const parentIds = member.parent_ids.sort((a, b) => a - b);
            const coupleKey = `${parentIds[0]}-${parentIds[1]}`;
            const midpointId = parentCoupleNodes.get(coupleKey);
            
            if (midpointId) {
              // Connect from midpoint to child
              generatedEdges.push({
                id: `e-midpoint-${midpointId}-${member.id}`,
                source: midpointId,
                target: String(member.id),
                type: 'smoothstep',
                style: { stroke: '#4a5568', strokeWidth: 2 },
              });
            } else {
              // Multiple parents but not spouses - connect from first parent
              const pid = member.parent_ids[0];
              if (pid != null && member.id != null) {
                generatedEdges.push({
                  id: `e${pid}-${member.id}`,
                  source: String(pid),
                  target: String(member.id),
                  type: 'smoothstep',
                  style: { stroke: '#4a5568', strokeWidth: 2 },
                });
              }
            }
          } else if (member.parent_ids.length === 1) {
            // Single parent - check if parent has a spouse (if so, use midpoint)
            const pid = member.parent_ids[0];
            if (pid != null && member.id != null) {
              const parent = members.find(m => m.id === pid);
              if (parent && parent.spouse_id != null) {
                // Parent has a spouse - check if we have a midpoint for this couple
                const coupleKey = [pid, parent.spouse_id].sort((a, b) => a - b).join('-');
                const midpointId = parentCoupleNodes.get(coupleKey);
                const coupleChildren = parentCoupleChildrenMap.get(coupleKey) || [];
                
                // Only use midpoint if this child is part of the couple's children group
                if (midpointId && coupleChildren.includes(member.id)) {
                  // Connect from midpoint to child
                  generatedEdges.push({
                    id: `e-midpoint-${midpointId}-${member.id}`,
                    source: midpointId,
                    target: String(member.id),
                    type: 'smoothstep',
                    style: { stroke: '#4a5568', strokeWidth: 2 },
                  });
                } else {
                  // Direct connection to parent
                  generatedEdges.push({
                    id: `e${pid}-${member.id}`,
                    source: String(pid),
                    target: String(member.id),
                    type: 'smoothstep',
                    style: { stroke: '#4a5568', strokeWidth: 2 },
                  });
                }
              } else {
                // No spouse - direct connection
                generatedEdges.push({
                  id: `e${pid}-${member.id}`,
                  source: String(pid),
                  target: String(member.id),
                  type: 'smoothstep',
                  style: { stroke: '#4a5568', strokeWidth: 2 },
                });
              }
            }
          }
        }
        
        // Spouse edges - horizontal connection between spouses
        if (member.spouse_id != null) {
          const edgeId1 = `spouse-${member.id}-${member.spouse_id}`;
          const edgeId2 = `spouse-${member.spouse_id}-${member.id}`;
          // Only add once per pair
          if (!spouseEdgesAdded.has(edgeId1) && !spouseEdgesAdded.has(edgeId2)) {
            // Determine which node is on the left based on their positions
            const memberPos = positions.get(member.id);
            const spousePos = positions.get(member.spouse_id);
            
            let sourceId, targetId, sourceHandle, targetHandle;
            if (memberPos && spousePos && memberPos.x < spousePos.x) {
              // Member is on the left, spouse is on the right
              sourceId = String(member.id);
              targetId = String(member.spouse_id);
              sourceHandle = 'spouse-right';
              targetHandle = 'spouse-left-target';
            } else {
              // Spouse is on the left, member is on the right
              sourceId = String(member.spouse_id);
              targetId = String(member.id);
              sourceHandle = 'spouse-right';
              targetHandle = 'spouse-left-target';
            }
            
            generatedEdges.push({
              id: edgeId1,
              source: sourceId,
              target: targetId,
              sourceHandle: sourceHandle,
              targetHandle: targetHandle,
              type: 'straight',
              style: { 
                stroke: '#d97706', 
                strokeWidth: 3,
                strokeDasharray: '5,5'
              },
              animated: false,
            });
            spouseEdgesAdded.add(edgeId1);
            spouseEdgesAdded.add(edgeId2);
          }
        }
      });

      // Combine regular nodes with midpoint nodes
      setNodes([...generatedNodes, ...midpointNodes]);
      setEdges(generatedEdges);
    });
  };

  useEffect(() => {
    fetchTreeName();
    fetchMembers();
  }, []);

  // Re-center view when nodes change
  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance.current) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    }
  }, [nodes]);

  const handleAddClick = async (nodeId) => {
    setTargetNodeId(nodeId);
    // Fetch the person's info to display in the form
    try {
      const res = await axios.get('http://localhost:8000/members');
      const person = res.data.find((m) => m.id === parseInt(nodeId));
      setTargetPersonInfo(person);
    } catch (err) {
      console.error('Error fetching person info:', err);
    }
    
    if (pendingRelationType) {
      // Use the pending relation type from header button
      setRelationType(pendingRelationType);
      setPendingRelationType(null);
      setShowForm(true);
    } else {
      // Show selection menu
      setShowForm(true);
      setRelationType('select');
    }
  };

  const handleRelationSelect = (relation) => {
    setRelationType(relation);
  };

  const handleAddRootClick = () => {
    setTargetNodeId(null);
    setRelationType('root');
    setShowForm(true);
  };

  const handleQuickAdd = (relation) => {
    if (relation === 'root') {
      // Root doesn't need a target node
      setTargetNodeId(null);
      setRelationType('root');
      setShowForm(true);
    } else {
      // Set pending relation type - next node click will use it
      setPendingRelationType(relation);
      const relationLabel = relation === 'parent' ? 'parent' : relation === 'child' ? 'child' : relation === 'sibling' ? 'sibling' : 'spouse/partner';
      alert(`Click on a person in the tree to add their ${relationLabel}.`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If an existing member is selected, link them instead of creating new
    if (selectedExistingMember) {
      try {
        if (relationType === 'parent' && targetNodeId) {
          // Link existing member as parent
          const res = await axios.get('http://localhost:8000/members');
          const target = res.data.find((m) => m.id === parseInt(targetNodeId));
          if (target) {
            const existingParentIds = target.parent_ids || [];
            
            if (!existingParentIds.includes(selectedExistingMember.id)) {
              if (existingParentIds.length === 0) {
                // Child has no parents - just add the existing member as parent
                const updated = {
                  ...target,
                  parent_ids: [selectedExistingMember.id],
                };
                await axios.put(`http://localhost:8000/members/${target.id}`, updated);
              } else if (existingParentIds.length === 1) {
                // Child has one parent - check if that parent has a spouse
                const existingParent = res.data.find(m => m.id === existingParentIds[0]);
                
                if (existingParent && existingParent.spouse_id) {
                  // Existing parent already has a spouse - add as additional parent
                  const updated = {
                    ...target,
                    parent_ids: [...existingParentIds, selectedExistingMember.id],
                  };
                  await axios.put(`http://localhost:8000/members/${target.id}`, updated);
                } else {
                  // Existing parent has no spouse - link as spouse and add as second parent
                  if (existingParent) {
                    const updatedExistingParent = {
                      ...existingParent,
                      spouse_id: selectedExistingMember.id,
                    };
                    await axios.put(`http://localhost:8000/members/${existingParent.id}`, updatedExistingParent);
                    
                    const updatedSelectedMember = {
                      ...selectedExistingMember,
                      spouse_id: existingParent.id,
                    };
                    await axios.put(`http://localhost:8000/members/${selectedExistingMember.id}`, updatedSelectedMember);
                  }
                  
                  // Add existing member to child's parent_ids
                  const updated = {
                    ...target,
                    parent_ids: [...existingParentIds, selectedExistingMember.id],
                  };
                  await axios.put(`http://localhost:8000/members/${target.id}`, updated);
                }
              } else {
                // Child already has multiple parents - just add another
                const updated = {
                  ...target,
                  parent_ids: [...existingParentIds, selectedExistingMember.id],
                };
                await axios.put(`http://localhost:8000/members/${target.id}`, updated);
              }
            } else {
              alert('This person is already a parent of this child.');
              return;
            }
          }
        } else if (relationType === 'child' && targetNodeId) {
          // Link existing member as child
          const res = await axios.get('http://localhost:8000/members');
          const existingMember = res.data.find(m => m.id === selectedExistingMember.id);
          if (existingMember) {
            const updated = {
              ...existingMember,
              parent_ids: [...(existingMember.parent_ids || []), parseInt(targetNodeId)],
            };
            await axios.put(`http://localhost:8000/members/${existingMember.id}`, updated);
          }
        } else if (relationType === 'spouse' && targetNodeId) {
          // Link existing member as spouse
          const res = await axios.get('http://localhost:8000/members');
          const target = res.data.find((m) => m.id === parseInt(targetNodeId));
          const existingMember = res.data.find(m => m.id === selectedExistingMember.id);
          
          if (target && existingMember) {
            const updatedTarget = {
              ...target,
              spouse_id: selectedExistingMember.id,
            };
            await axios.put(`http://localhost:8000/members/${target.id}`, updatedTarget);
            
            const updatedExistingMember = {
              ...existingMember,
              spouse_id: parseInt(targetNodeId),
            };
            await axios.put(`http://localhost:8000/members/${existingMember.id}`, updatedExistingMember);
          }
        } else if (relationType === 'sibling' && targetNodeId) {
          // Link existing member as sibling
          const res = await axios.get('http://localhost:8000/members');
          const target = res.data.find((m) => m.id === parseInt(targetNodeId));
          const existingMember = res.data.find(m => m.id === selectedExistingMember.id);
          
          if (target && existingMember && target.parent_ids?.length) {
            const updated = {
              ...existingMember,
              parent_ids: target.parent_ids,
            };
            await axios.put(`http://localhost:8000/members/${existingMember.id}`, updated);
          }
        }
        
        fetchMembers();
        setShowForm(false);
        setRelationType(null);
        setTargetNodeId(null);
        setTargetPersonInfo(null);
        setSelectedExistingMember(null);
        setPendingRelationType(null);
        setFormData({ name: '', date_of_birth: '', photo_url: null, photo_position: '50% 50%' });
        return;
      } catch (err) {
        console.error('Error linking existing member:', err);
        alert('Error linking existing member. Please try again.');
        return;
      }
    }

    // Handle editing existing member
    if (relationType === 'edit' && targetNodeId) {
      try {
        const res = await axios.get('http://localhost:8000/members');
        const existingMember = res.data.find((m) => m.id === parseInt(targetNodeId));
        if (existingMember) {
          const updated = {
            ...existingMember,
            name: formData.name,
            date_of_birth: formData.date_of_birth,
            photo_url: formData.photo_url,
            photo_position: formData.photo_position,
          };
          await axios.put(`http://localhost:8000/members/${existingMember.id}`, updated);
          fetchMembers();
          setShowForm(false);
          setRelationType(null);
          setTargetNodeId(null);
          setTargetPersonInfo(null);
          setFormData({ name: '', date_of_birth: '', photo_url: null, photo_position: '50% 50%' });
          return;
        }
      } catch (err) {
        console.error('Error updating member:', err);
        alert('Error updating member. Please try again.');
        return;
      }
    }

    // Otherwise, create a new member
    let payload = {
      name: formData.name,
      date_of_birth: formData.date_of_birth,
      photo_url: formData.photo_url,
      photo_position: formData.photo_position,
      parent_ids: [],
    };

    try {
      if (relationType === 'child') {
        if (targetNodeId) {
          payload.parent_ids = [parseInt(targetNodeId)];
        } else {
          // Quick add child - need to select a parent
          alert('Please click on a person in the tree first to add them as a child.');
          return;
        }
      } else if (relationType === 'sibling') {
        if (targetNodeId) {
          const res = await axios.get('http://localhost:8000/members');
          const current = res.data.find((m) => m.id === parseInt(targetNodeId));
          if (current?.parent_ids?.length) {
            payload.parent_ids = current.parent_ids;
          } else {
            alert('This person has no parents, so siblings cannot be linked yet.');
            return;
          }
        } else {
          // Quick add sibling - need to select a person
          alert('Please click on a person in the tree first to add their sibling.');
          return;
        }
      } else if (relationType === 'parent') {
        if (targetNodeId) {
          payload.parent_ids = [];
        } else {
          // Quick add parent - need to select a child
          alert('Please click on a person in the tree first to add their parent.');
          return;
        }
      } else if (relationType === 'root') {
        payload.parent_ids = [];
      } else if (relationType === 'spouse') {
        if (targetNodeId) {
          payload.parent_ids = [];
          // The spouse relationship will be set after creation
        } else {
          alert('Please click on a person in the tree first to add their spouse.');
          return;
        }
      }

      const response = await axios.post('http://localhost:8000/members', payload);
      const newMember = response.data;

      if (relationType === 'parent' && targetNodeId) {
        const res = await axios.get('http://localhost:8000/members');
        const target = res.data.find((m) => m.id === parseInt(targetNodeId));
        if (target) {
          const existingParentIds = target.parent_ids || [];
          
          if (existingParentIds.length === 0) {
            // Child has no parents - just add the new parent
            const updated = {
              ...target,
              parent_ids: [newMember.id],
            };
            await axios.put(`http://localhost:8000/members/${target.id}`, updated);
          } else if (existingParentIds.length === 1) {
            // Child has one parent - check if that parent has a spouse
            const existingParent = res.data.find(m => m.id === existingParentIds[0]);
            
            if (existingParent && existingParent.spouse_id) {
              // Existing parent already has a spouse - add new parent as additional parent
              const updated = {
                ...target,
                parent_ids: [...existingParentIds, newMember.id],
              };
              await axios.put(`http://localhost:8000/members/${target.id}`, updated);
            } else {
              // Existing parent has no spouse - link new parent as spouse and add as second parent
              // First, link them as spouses
              if (existingParent) {
                const updatedExistingParent = {
                  ...existingParent,
                  spouse_id: newMember.id,
                };
                await axios.put(`http://localhost:8000/members/${existingParent.id}`, updatedExistingParent);
                
                const updatedNewMember = {
                  ...newMember,
                  spouse_id: existingParent.id,
                };
                await axios.put(`http://localhost:8000/members/${newMember.id}`, updatedNewMember);
              }
              
              // Then add new parent to child's parent_ids
              const updated = {
                ...target,
                parent_ids: [...existingParentIds, newMember.id],
              };
              await axios.put(`http://localhost:8000/members/${target.id}`, updated);
            }
          } else {
            // Child already has multiple parents - just add another
            const updated = {
              ...target,
              parent_ids: [...existingParentIds, newMember.id],
            };
            await axios.put(`http://localhost:8000/members/${target.id}`, updated);
          }
        }
      } else if (relationType === 'spouse' && targetNodeId) {
        // Link spouses bidirectionally
        const res = await axios.get('http://localhost:8000/members');
        const target = res.data.find((m) => m.id === parseInt(targetNodeId));
        if (target) {
          // Update target to have new member as spouse
          const updatedTarget = {
            ...target,
            spouse_id: newMember.id,
          };
          await axios.put(`http://localhost:8000/members/${target.id}`, updatedTarget);
          
          // Update new member to have target as spouse
          const updatedNewMember = {
            ...newMember,
            spouse_id: parseInt(targetNodeId),
          };
          await axios.put(`http://localhost:8000/members/${newMember.id}`, updatedNewMember);
        }
      }

      fetchMembers();
      setShowForm(false);
      setRelationType(null);
      setTargetNodeId(null);
      setTargetPersonInfo(null);
      setSelectedExistingMember(null);
      setShowMemberSearch(false);
      setPendingRelationType(null);
      setFormData({ name: '', date_of_birth: '' });
    } catch (err) {
      console.error('Error adding member:', err);
      alert('Error adding member. Please try again.');
    }
  };

  const getRelationLabel = (type) => {
    const labels = {
      root: 'Family Member',
      parent: 'Parent',
      child: 'Child',
      sibling: 'Sibling',
      spouse: 'Spouse/Partner',
      edit: 'Edit',
    };
    return labels[type] || type;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: '#ffffff',
        color: '#1a202c',
        padding: '18px 40px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', color: '#1a202c' }}>Canopy</h1>
            {isEditingTreeName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  value={tempTreeName}
                  onChange={(e) => setTempTreeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (tempTreeName.trim()) {
                        updateTreeName(tempTreeName.trim());
                      } else {
                        setIsEditingTreeName(false);
                        setTempTreeName('');
                      }
                    } else if (e.key === 'Escape') {
                      setIsEditingTreeName(false);
                      setTempTreeName('');
                    }
                  }}
                  onBlur={() => {
                    if (tempTreeName.trim()) {
                      updateTreeName(tempTreeName.trim());
                    } else {
                      setIsEditingTreeName(false);
                      setTempTreeName('');
                    }
                  }}
                  autoFocus
                  style={{
                    fontSize: 13,
                    color: '#4a5568',
                    fontWeight: 500,
                    border: '1px solid #cbd5e0',
                    borderRadius: 4,
                    padding: '4px 8px',
                    background: '#fff',
                    minWidth: 200,
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span 
                  onClick={() => {
                    setTempTreeName(treeName);
                    setIsEditingTreeName(true);
                  }}
                  style={{ 
                    fontSize: 13, 
                    color: '#718096', 
                    fontWeight: 400,
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 4,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f7fafc';
                    e.target.style.color = '#4a5568';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#718096';
                  }}
                  title="Click to edit tree name"
                >
                  {treeName}
                </span>
              </div>
            )}
          </div>
        </div>
        <div>
          {nodes.length === 0 && (
            <button
              onClick={handleAddRootClick}
              style={{
                padding: '10px 20px',
                background: '#1a202c',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#2d3748';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#1a202c';
              }}
            >
              Start Your Tree
            </button>
          )}
          <button
            onClick={() => {
              // Placeholder for My Account functionality
              alert('My Account feature coming soon!');
            }}
            style={{
              padding: '8px 16px',
              background: '#f7fafc',
              color: '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s ease',
              marginLeft: nodes.length > 0 ? 0 : 12
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#edf2f7';
              e.target.style.borderColor = '#cbd5e0';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#f7fafc';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            My Account
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', background: '#f7fafc' }}>
        {showForm && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#ffffff',
              padding: 32,
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              maxWidth: 480,
              width: '90%',
              border: '1px solid #e2e8f0'
            }}>
              {relationType === 'select' && targetNodeId ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2 style={{ marginTop: 0, marginBottom: 8, color: '#1a202c', fontSize: 22, fontWeight: 600 }}>
                      Add a Relative
                    </h2>
                    <p style={{ marginBottom: 0, color: '#718096', fontSize: 14 }}>
                      Choose the relationship to add
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={() => handleRelationSelect('parent')}
                      style={{
                        padding: '12px 20px',
                        background: '#1a202c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#2d3748';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#1a202c';
                      }}
                    >
                      Add Parent
                    </button>
                    <button
                      onClick={() => handleRelationSelect('child')}
                      style={{
                        padding: '12px 20px',
                        background: '#1a202c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#2d3748';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#1a202c';
                      }}
                    >
                      Add Child
                    </button>
                    <button
                      onClick={() => handleRelationSelect('sibling')}
                      style={{
                        padding: '12px 20px',
                        background: '#1a202c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#2d3748';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#1a202c';
                      }}
                    >
                      Add Sibling
                    </button>
                    <button
                      onClick={() => handleRelationSelect('spouse')}
                      style={{
                        padding: '12px 20px',
                        background: '#1a202c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#2d3748';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#1a202c';
                      }}
                    >
                      Add Spouse
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setPendingRelationType(null);
                      setTargetNodeId(null);
                      setTargetPersonInfo(null);
                      setSelectedExistingMember(null);
                      setShowMemberSearch(false);
                    }}
                    style={{
                      marginTop: 16,
                      padding: '10px 20px',
                      background: 'transparent',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ textAlign: 'left', marginBottom: 20 }}>
                    <h2 style={{ marginTop: 0, marginBottom: 12, color: '#1a202c', fontSize: 20, fontWeight: 600 }}>
                      Add {getRelationLabel(relationType)}
                    </h2>
                    {relationType === 'parent' && targetPersonInfo && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: '12px 16px', 
                        background: '#f7fafc', 
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: 13, color: '#4a5568', fontWeight: 500, marginBottom: 4 }}>
                          For: {targetPersonInfo.name}
                        </div>
                        {targetPersonInfo.parent_ids && targetPersonInfo.parent_ids.length > 0 && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                            Existing parent{targetPersonInfo.parent_ids.length > 1 ? 's' : ''}: {
                              targetPersonInfo.parent_ids.map((pid, idx) => {
                                const parent = allMembers.find(m => m.id === pid);
                                return parent ? parent.name : `Parent ${idx + 1}`;
                              }).join(', ')
                            }
                            {targetPersonInfo.parent_ids.length === 1 && (
                              <span style={{ fontSize: 11, color: '#999', marginLeft: 4, display: 'block', marginTop: 4 }}>
                                (New parent will be linked as their spouse if they don't have one)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {relationType === 'child' && targetPersonInfo && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: '12px 16px', 
                        background: '#f7fafc', 
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: 13, color: '#4a5568', fontWeight: 500 }}>
                          Child of: {targetPersonInfo.name}
                        </div>
                      </div>
                    )}
                    {relationType === 'sibling' && targetPersonInfo && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: '12px 16px', 
                        background: '#f7fafc', 
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: 13, color: '#4a5568', fontWeight: 500 }}>
                          Sibling of: {targetPersonInfo.name}
                        </div>
                      </div>
                    )}
                    {relationType === 'spouse' && targetPersonInfo && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: '12px 16px', 
                        background: '#f7fafc', 
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: 13, color: '#4a5568', fontWeight: 500 }}>
                          Spouse/Partner of: {targetPersonInfo.name}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Search/Select Existing Member */}
                  {relationType !== 'root' && allMembers.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', marginBottom: 10, color: '#1a202c', fontWeight: 500, fontSize: 14 }}>
                        Link Existing Person
                      </label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                          type="text"
                          placeholder="Search by name..."
                          value={formData.name}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, name: e.target.value }));
                            setShowMemberSearch(e.target.value.length > 0);
                            setSelectedExistingMember(null);
                          }}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: '3px solid #e0e0e0',
                            borderRadius: 12,
                            fontSize: 16,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      {showMemberSearch && formData.name.length > 0 && (
                        <div style={{
                          maxHeight: 200,
                          overflowY: 'auto',
                          border: '2px solid #e0e0e0',
                          borderRadius: 12,
                          background: '#fff',
                          marginBottom: 12
                        }}>
                          {allMembers
                            .filter(m => 
                              m.name.toLowerCase().includes(formData.name.toLowerCase()) &&
                              (!targetNodeId || m.id !== parseInt(targetNodeId)) // Don't show the target person
                            )
                            .map(member => (
                              <div
                                key={member.id}
                                onClick={() => {
                                  setSelectedExistingMember(member);
                                  setFormData(prev => ({ ...prev, name: member.name, date_of_birth: member.date_of_birth || '', photo_url: member.photo_url || null, photo_position: member.photo_position || '50% 50%' }));
                                  setShowMemberSearch(false);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f0f0f0',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                              >
                                <div style={{ fontWeight: 600, color: '#2d3748' }}>{member.name}</div>
                                {member.date_of_birth && (
                                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                                    Born: {member.date_of_birth}
                                  </div>
                                )}
                              </div>
                            ))}
                          {allMembers.filter(m => 
                            m.name.toLowerCase().includes(formData.name.toLowerCase()) &&
                            (!targetNodeId || m.id !== parseInt(targetNodeId))
                          ).length === 0 && (
                            <div style={{ padding: '12px 16px', color: '#999', fontStyle: 'italic' }}>
                              No matching people found
                            </div>
                          )}
                        </div>
                      )}
                      {selectedExistingMember && (
                        <div style={{
                          padding: '12px 16px',
                          background: '#e8f5e9',
                          borderRadius: 8,
                          border: '2px solid #4caf50',
                          marginBottom: 12
                        }}>
                          <div style={{ fontSize: 14, color: '#2d3748', fontWeight: 600 }}>
                            ✓ Will link existing person: {selectedExistingMember.name}
                          </div>
                        </div>
                      )}
                      <div style={{ 
                        fontSize: 12, 
                        color: '#718096', 
                        marginTop: 8, 
                        padding: '8px 12px',
                        background: '#f7fafc',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0'
                      }}>
                        Tip: Type a name to search, or enter a new name below to create a new person
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, color: '#1a202c', fontWeight: 500, fontSize: 14 }}>
                      {selectedExistingMember ? 'Name (editing existing)' : 'Name *'}
                    </label>
                    <input
                      name="name"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={handleChange}
                      required={!selectedExistingMember}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        background: '#fff'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4a5568';
                        e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, color: '#1a202c', fontWeight: 500, fontSize: 14 }}>
                      Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, photo_url: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        background: '#fff'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4a5568';
                        e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {formData.photo_url && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{
                          width: '100%',
                          height: 200,
                          overflow: 'hidden',
                          borderRadius: 8,
                          position: 'relative',
                          background: '#edf2f7',
                          marginBottom: 12
                        }}>
                          <img 
                            src={formData.photo_url} 
                            alt="Preview" 
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              objectPosition: formData.photo_position || '50% 50%',
                              cursor: 'move'
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const img = e.currentTarget;
                              const container = img.parentElement;
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startPosition = formData.photo_position || '50% 50%';
                              const [startXPercent, startYPercent] = startPosition.split(' ').map(v => parseFloat(v));
                              
                              const handleMouseMove = (moveEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                const deltaY = moveEvent.clientY - startY;
                                const containerRect = container.getBoundingClientRect();
                                const xPercent = Math.max(0, Math.min(100, startXPercent + (deltaX / containerRect.width) * 100));
                                const yPercent = Math.max(0, Math.min(100, startYPercent + (deltaY / containerRect.height) * 100));
                                setFormData(prev => ({ ...prev, photo_position: `${xPercent}% ${yPercent}%` }));
                              };
                              
                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };
                              
                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                          Click and drag the image to adjust position
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', marginBottom: 8, color: '#1a202c', fontWeight: 500, fontSize: 14 }}>
                      Date of Birth
                    </label>
                    <input
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        background: '#fff'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4a5568';
                        e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        background: '#1a202c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#2d3748';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#1a202c';
                      }}
                    >
                      {relationType === 'edit' ? 'Save Changes' : 'Add to Tree'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setRelationType(null);
                        setTargetNodeId(null);
                        setTargetPersonInfo(null);
                        setSelectedExistingMember(null);
                        setShowMemberSearch(false);
                        setPendingRelationType(null);
                        setFormData({ name: '', date_of_birth: '', photo_url: null, photo_position: '50% 50%' });
                      }}
                      style={{
                        padding: '16px 24px',
                        background: '#f7fafc',
                        color: '#666',
                        border: '2px solid #e2e8f0',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#edf2f7';
                        e.target.style.borderColor = '#cbd5e0';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#f7fafc';
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={(instance) => {
            reactFlowInstance.current = instance;
            instance.fitView({ padding: 0.2 });
          }}
          nodeTypes={nodeTypes}
          style={{ background: 'transparent' }}
        >
          <Background color="#edf2f7" gap={16} size={1} />
          <Controls 
            style={{ 
              background: '#fff', 
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }} 
          />
        </ReactFlow>
      </div>
    </div>
  );
};

const TreeView = () => (
  <ReactFlowProvider>
    <TreeViewContent />
  </ReactFlowProvider>
);

export default TreeView;

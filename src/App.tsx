import React, { useRef, useState, useEffect } from 'react'
import { Activity, AlertTriangle, Box, ChevronRight, Clock, Download, HelpCircle, Image as ImageIcon, Layers, Map, Moon, Network, Plus, Search, Settings, Sparkles, Target, Trash2, Upload, X, Briefcase, Shield, Landmark, Users, Hammer, Cross } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { get, set } from 'idb-keyval'
import CustomNode from './CustomNode'
import GenealogyNode from './GenealogyNode'
import { IconMap } from './CustomNode'
import { EntityConfig, EntityType, AurumNodeData, FrameworkMode, CharacterStatus, AurumNode, AurumEdge, CameraState } from './types'

const STORAGE_KEY = 'aurum_engine_save';

const initialNodes: AurumNode[] = [
  { 
    id: '1', 
    type: 'custom',
    position: { x: 250, y: 100 }, 
    data: { label: 'Organização Central', entityType: 'organization', description: 'O núcleo do seu mundo.' } as AurumNodeData
  },
  { 
    id: '2', 
    type: 'custom',
    position: { x: 100, y: 300 }, 
    data: { label: 'Figura Principal', entityType: 'character', description: 'Entidade de importância primária.' } as AurumNodeData
  }
];

const initialEdges: AurumEdge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'Conexão Primária' },
];

export default function App() {
  // --- Persistent State ---
  const [nodes, setNodes] = useState<AurumNode[]>(initialNodes);
  
  const [edges, setEdges] = useState<AurumEdge[]>(initialEdges);

  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string | null, canvasPos: {x:number, y:number} } | null>(null);

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('contrast');

  const [framework, setFramework] = useState<FrameworkMode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, endX: number, endY: number} | null>(null);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [previewNode, setPreviewNode] = useState<AurumNodeData | null>(null);
  const [previewTab, setPreviewTab] = useState<'visual'|'text'|'3d'|'tech'>('visual');

  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Initial Load Effect (idb-keyval with localStorage fallback)
  useEffect(() => {
    async function loadData() {
      try {
        const idbData = await get(STORAGE_KEY);
        if (idbData) {
          if (idbData.nodes) setNodes(idbData.nodes);
          if (idbData.edges) setEdges(idbData.edges);
          if (idbData.camera) setCamera(idbData.camera);
          if (idbData.bgImage !== undefined) setBgImage(idbData.bgImage);
          if (idbData.theme !== undefined) setTheme(idbData.theme);
        } else {
          // Fallback to localStorage if migrating
          const lsData = localStorage.getItem(STORAGE_KEY);
          if (lsData) {
            const parsed = JSON.parse(lsData);
            if (parsed.nodes) setNodes(parsed.nodes);
            if (parsed.edges) setEdges(parsed.edges);
            if (parsed.camera) setCamera(parsed.camera);
            if (parsed.bgImage !== undefined) setBgImage(parsed.bgImage);
            if (parsed.theme !== undefined) setTheme(parsed.theme);
          }
        }
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setIsDbLoaded(true);
      }
    }
    loadData();
  }, []);


  // Apply theme to body
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        setIsSpaceDown(true);
      }

      // Zera propriedades / Reseta Posição / Deleta
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          if (e.ctrlKey) {
            setNodes(prev => prev.map(n => selectedNodes.includes(n.id) ? { ...n, data: { ...n.data, description: '', label: `${EntityConfig[n.data.entityType || 'concept'].label} Resetado` } } : n));
          } else if (e.ctrlKey || e.metaKey) {
            setNodes(prev => prev.map(n => selectedNodes.includes(n.id) ? { ...n, position: { x: 0, y: 0 } } : n));
          } else {
            setNodes(prev => prev.filter(n => !selectedNodes.includes(n.id)));
            setEdges(prev => prev.filter(edge => !selectedNodes.includes(edge.source) && !selectedNodes.includes(edge.target)));
            setSelectedNodes([]);
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodes, setNodes, setEdges]);

  // Auto-Save Effect
  useEffect(() => {
    if (!isDbLoaded) return; // Prevent overwriting with initial empty state before load
    const saveData = { version: '1.0', nodes, edges, camera, bgImage, theme };
    set(STORAGE_KEY, saveData).catch(err => {
      console.error("Aurum Engine: Falha ao salvar no IndexedDB", err);
    });
  }, [nodes, edges, camera, bgImage, theme, isDbLoaded]);

  // --- Aurum Flow Engine State ---
  const [activeContextFolder, setActiveContextFolder] = useState<string | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragStartData = useRef<{ mouse: { x: number, y: number }, nodes: Record<string, { x: number, y: number, w: number, h: number }> } | null>(null);

  // --- System Functions ---
  const handleExport = () => {
    const saveData = { version: '1.0', nodes, edges, camera, bgImage, theme };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'universo.aurum';
    a.click();
    URL.revokeObjectURL(url);
    setIsSystemMenuOpen(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.camera) setCamera(data.camera);
        if (data.bgImage !== undefined) setBgImage(data.bgImage);
        setIsSystemMenuOpen(false);
      } catch (err) {
        alert('Arquivo .aurum inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará o universo inteiro! Tem certeza?")) {
      setNodes([]);
      setEdges([]);
      setCamera({ x: 0, y: 0, zoom: 1 });
      setBgImage(null);
      setSelectedNodes([]);
      setIsSystemMenuOpen(false);
    }
  };

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.aurum-node');
    
    let nodeId = null;
    if (nodeEl) {
      nodeId = nodeEl.getAttribute('data-id');
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const canvasPos = {
        x: (e.clientX - rect.left - camera.x) / camera.zoom,
        y: (e.clientY - rect.top - camera.y) / camera.zoom
      };
      
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        nodeId: nodeId,
        canvasPos
      });
    }
  };

  const closeContextMenu = () => {
    if (contextMenu) setContextMenu(null);
    setActiveContextFolder(null);
  };

  // --- Engine Interactions ---
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    closeContextMenu();
    if (e.button === 2) return; 
    
    if (connectingNodeId) {
      setConnectingNodeId(null);
    } else {
      setSelectedNodes([]);
      setIsInspectorOpen(false);
      setIsSystemMenuOpen(false);
      setFramework(null);
      if (isSpaceDown) {
        setIsDraggingCanvas(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (isDraggingCanvas) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }

    if (connectingNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - camera.x) / camera.zoom,
        y: (e.clientY - rect.top - camera.y) / camera.zoom
      });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (connectingNodeId) {
      setConnectingNodeId(null);
    }
    if (selectionBox) {
      setSelectionBox(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    setCamera(prev => {
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(0.2, prev.zoom + delta), 3);
      return { ...prev, zoom: newZoom };
    });
  };

  const handleNodePointerDown = (e: React.PointerEvent, n: AurumNode) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    
    setDraggedNodeId(n.id);
    
    let activeNodes = selectedNodes;
    if (e.shiftKey) {
      activeNodes = selectedNodes.includes(n.id) ? selectedNodes.filter(id => id !== n.id) : [...selectedNodes, n.id];
      setSelectedNodes(activeNodes);
      setIsInspectorOpen(true);
    } else if (!selectedNodes.includes(n.id)) {
      activeNodes = [n.id];
      setSelectedNodes(activeNodes);
    }
    
    dragStartData.current = {
      mouse: { x: e.clientX, y: e.clientY },
      nodes: nodes.reduce((acc, curr) => {
        if (activeNodes.includes(curr.id)) {
          acc[curr.id] = { 
            x: curr.position.x, 
            y: curr.position.y, 
            w: curr.width || nodeRefs.current[curr.id]?.offsetWidth || 150, 
            h: curr.height || nodeRefs.current[curr.id]?.offsetHeight || 60 
          };
        }
        return acc;
      }, {} as Record<string, { x: number, y: number, w: number, h: number }>)
    };
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleNodePointerMove = (e: React.PointerEvent, id: string) => {
    if (draggedNodeId === id && dragStartData.current) {
      const dx = (e.clientX - dragStartData.current.mouse.x) / camera.zoom;
      const dy = (e.clientY - dragStartData.current.mouse.y) / camera.zoom;
      const startNodes = dragStartData.current.nodes;
      
      if (e.ctrlKey || e.metaKey) {
        setNodes(nds => nds.map(n => startNodes[n.id] ? {
          ...n,
          width: Math.max(150, startNodes[n.id].w + dx),
          height: Math.max(60, startNodes[n.id].h + dy)
        } : n));
      } else {
        setNodes(nds => nds.map(n => startNodes[n.id] ? {
          ...n,
          position: { x: startNodes[n.id].x + dx, y: startNodes[n.id].y + dy }
        } : n));
      }
    }
  };

  const handleNodePointerUp = (e: React.PointerEvent, id: string) => {
    dragStartData.current = null;
    if (draggedNodeId === id) setDraggedNodeId(null);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (connectingNodeId && connectingNodeId !== id) {
      setEdges(prev => [...prev, {
        id: `e-${connectingNodeId}-${id}`,
        source: connectingNodeId,
        target: id
      }]);
    }
    
    if (draggedNodeId === id) {
      setDraggedNodeId(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    setConnectingNodeId(null);
  };

  const startConnection = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setConnectingNodeId(id);
    
    const nodeEl = nodeRefs.current[id];
    if (nodeEl && containerRef.current) {
       const rect = containerRef.current.getBoundingClientRect();
       setMousePos({
          x: (e.clientX - rect.left - camera.x) / camera.zoom,
          y: (e.clientY - rect.top - camera.y) / camera.zoom
       });
    }
  };

  // --- Utility to Draw Edges ---
  const getClosestAnchor = (nodePos: {x:number, y:number}, w: number, h: number, targetPos: {x:number, y:number}) => {
    const anchors = [
      { id: 'top', x: nodePos.x + w/2, y: nodePos.y, dx: 0, dy: -1 },
      { id: 'bottom', x: nodePos.x + w/2, y: nodePos.y + h, dx: 0, dy: 1 },
      { id: 'left', x: nodePos.x, y: nodePos.y + h/2, dx: -1, dy: 0 },
      { id: 'right', x: nodePos.x + w, y: nodePos.y + h/2, dx: 1, dy: 0 }
    ];
    let closest = anchors[0];
    let minDist = Infinity;
    for (const a of anchors) {
      const dist = Math.hypot(a.x - targetPos.x, a.y - targetPos.y);
      if (dist < minDist) {
        minDist = dist;
        closest = a;
      }
    }
    return closest;
  };

  const getEdgeAnchors = (sourceId: string, targetId: string | null, mousePos: {x:number, y:number} | null) => {
    const sNode = nodes.find(n => n.id === sourceId);
    if (!sNode) return { p1: {x:0, y:0, dx:0, dy:0}, p2: {x:0, y:0, dx:0, dy:0} };
    
    const sEl = nodeRefs.current[sourceId];
    const sw = sEl ? sEl.offsetWidth : 150;
    const sh = sEl ? sEl.offsetHeight : 60;
    const sCenter = { x: sNode.position.x + sw/2, y: sNode.position.y + sh/2 };

    let tPos = mousePos || {x:0, y:0};
    let tCenter = tPos;
    let tNode = null;
    let tw = 0, th = 0;

    if (targetId) {
      tNode = nodes.find(n => n.id === targetId);
      if (tNode) {
        const tEl = nodeRefs.current[targetId];
        tw = tEl ? tEl.offsetWidth : 150;
        th = tEl ? tEl.offsetHeight : 60;
        tCenter = { x: tNode.position.x + tw/2, y: tNode.position.y + th/2 };
        tPos = tCenter;
      }
    }

    const p1 = getClosestAnchor(sNode.position, sw, sh, tCenter);
    
    let p2;
    if (tNode) {
      p2 = getClosestAnchor(tNode.position, tw, th, sCenter);
    } else {
      p2 = { x: tPos.x, y: tPos.y, dx: -p1.dx, dy: -p1.dy }; // guess opposite direction for mouse
    }

    return { p1, p2 };
  };

  const drawBezier = (p1: {x:number, y:number, dx:number, dy:number}, p2: {x:number, y:number, dx:number, dy:number}) => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const offset = Math.max(dist * 0.4, 30);
    const c1x = p1.x + p1.dx * offset;
    const c1y = p1.y + p1.dy * offset;
    const c2x = p2.x + p2.dx * offset;
    const c2y = p2.y + p2.dy * offset;
    return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  };

  // --- Standard UI Handlers ---
  const handleAddNode = (type: EntityType, pos?: {x:number, y:number}) => {
    const config = EntityConfig[type];
    const newNode: AurumNode = {
      id: uuidv4(),
      type: 'custom',
      position: pos || { x: (-camera.x + window.innerWidth/2)/camera.zoom - 100, y: (-camera.y + window.innerHeight/2)/camera.zoom - 30 },
      data: { 
        label: config.label, 
        entityType: type, 
        description: '' 
      } as AurumNodeData
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodes([newNode.id]);
    closeContextMenu();
  };
  
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('entityType') as EntityType | 'group' | 'member';
    const isGenealogy = e.dataTransfer.getData('isGenealogy') === 'true';
    if (!type) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calcula a posição real no canvas baseado no mouse e zoom
    const dropPos = {
      x: (e.clientX - rect.left - camera.x) / camera.zoom,
      y: (e.clientY - rect.top - camera.y) / camera.zoom
    };

    if (isGenealogy) {
      handleAddGenealogyNode(type as 'group' | 'member', dropPos);
    } else {
      handleAddNode(type as EntityType, dropPos);
    }
  };

  const handleAddGenealogyNode = (type: string, pos?: {x:number, y:number}) => {
    let label = 'Personagem';
    let entityType = 'character';
    let iconName = 'user';
    if (type !== 'member') {
      entityType = 'organization';
      switch (type) {
        case 'group': label = 'Facção'; iconName = 'network'; break;
        case 'company': label = 'Empresa'; iconName = 'briefcase'; break;
        case 'clan': label = 'Clã'; iconName = 'shield'; break;
        case 'family': label = 'Família'; iconName = 'users'; break;
        case 'guild': label = 'Guilda'; iconName = 'hammer'; break;
        case 'government': label = 'Governo'; iconName = 'landmark'; break;
        case 'order': label = 'Ordem'; iconName = 'cross'; break;
      }
    }

    const newNode: AurumNode = {
      id: uuidv4(),
      type: 'genealogy',
      position: pos || { x: (-camera.x + window.innerWidth/2)/camera.zoom - 75, y: (-camera.y + window.innerHeight/2)/camera.zoom - 30 },
      data: { 
        label, 
        entityType: entityType as EntityType, 
        iconName,
        description: '',
        status: 'alive'
      } as AurumNodeData
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodes([newNode.id]);
    closeContextMenu();
  };

  const handleDeleteNode = () => {
    if (selectedNodes.length === 0) return;
    const selectedNode = nodes.find(n => n.id === selectedNodes[0]);
    if (!selectedNode) return;
    setNodes(nds => nds.filter((n) => n.id !== selectedNodes[0]));
    setEdges(eds => eds.filter((e) => e.source !== selectedNodes[0] && e.target !== selectedNodes[0]));
    setSelectedNodes([]);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* PAINEL ESQUERDO: MENU PRINCIPAL & LISTA */}
      <aside className="glass-panel" style={{ 
        width: isLeftPanelOpen ? '300px' : '0px', 
        height: '100%', 
        zIndex: 10, 
        display: 'flex', 
        flexDirection: 'column',
        borderRight: isLeftPanelOpen ? '1px solid var(--border-color)' : 'none',
        borderLeft: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        position: 'relative',
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px 24px 12px 24px', minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <img 
              src="/favicon02.png" 
              alt="Aurum Story Engine Logo" 
              style={{ width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 15px rgba(212, 175, 55, 0.15)' }} 
            />
            <h1 style={{ color: 'var(--gold-primary)', fontFamily: 'Xirod, sans-serif', fontSize: '1.05rem', margin: 0, fontWeight: 'normal', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
              AURUM STORY <br/> <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', letterSpacing: '2px' }}>ENGINE</span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Acesso ao Conhecimento Narrativo
          </p>

        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
          {/* FRAMEWORK SELECTOR */}
          <h2 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>
            Módulos de Contexto
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              {
                id: 'core',
                title: 'MUNDO',
                subtitle: 'Diagramação geral e conexões',
                icon: <Box size={16} />,
                tools: Object.entries(EntityConfig).filter(([k]) => ['location', 'organization', 'event', 'object', 'concept', 'lore'].includes(k)).map(([key, config]) => {
                  const Icon = IconMap[config.iconName] || Plus;
                  return (
                    <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                      <Icon size={14} /> {config.label}
                    </button>
                  );
                })
              },
              {
                id: 'genealogy',
                title: 'ENTIDADES',
                subtitle: 'Facções, Genealogia e Estruturas',
                icon: <Network size={16} />,
                tools: [
                  <button key="g2" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'member'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('member'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><IconMap.user size={14} /> Personagem</button>,
                  <button key="g1" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'group'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('group'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Network size={14} /> Facção</button>,
                  <button key="g3" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'company'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('company'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Briefcase size={14} /> Empresa</button>,
                  <button key="g4" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'clan'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('clan'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Shield size={14} /> Clã</button>,
                  <button key="g5" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'family'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('family'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Users size={14} /> Família</button>,
                  <button key="g6" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'guild'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('guild'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Hammer size={14} /> Guilda</button>,
                  <button key="g7" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'government'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('government'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Landmark size={14} /> Governo</button>,
                  <button key="g8" draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', 'order'); e.dataTransfer.setData('isGenealogy', 'true'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddGenealogyNode('order'); }} style={{ '--neon-color': '#00E5FF', '--neon-dim': '#00E5FF40', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}><Cross size={14} /> Ordem</button>
                ]
              },
              {
                id: 'timeline',
                title: 'CRONOLOGIA',
                subtitle: 'Eras, períodos e marcos',
                icon: <Clock size={16} />,
                tools: ['era', 'epoch', 'historical_event'].map(key => {
                  const config = EntityConfig[key as EntityType];
                  const Icon = IconMap[config.iconName] || Plus;
                  return <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                    <Icon size={14} /> {config.label}
                  </button>
                })
              },
              {
                id: 'plot',
                title: 'NARRATIVA',
                subtitle: 'Missões, tramas e conflitos',
                icon: <Target size={16} />,
                tools: ['quest', 'plot', 'conflict'].map(key => {
                  const config = EntityConfig[key as EntityType];
                  const Icon = IconMap[config.iconName] || Plus;
                  return <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                    <Icon size={14} /> {config.label}
                  </button>
                })
              },
              {
                id: 'magic',
                title: 'PODERES',
                subtitle: 'Magia, leis físicas e tec',
                icon: <Sparkles size={16} />,
                tools: ['spell', 'skill', 'technology'].map(key => {
                  const config = EntityConfig[key as EntityType];
                  const Icon = IconMap[config.iconName] || Plus;
                  return <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                    <Icon size={14} /> {config.label}
                  </button>
                })
              },
              {
                id: 'geography',
                title: 'GEOGRAFIA',
                subtitle: 'Territórios, biomas e locais',
                icon: <Map size={16} />,
                tools: ['territory', 'biome'].map(key => {
                  const config = EntityConfig[key as EntityType];
                  const Icon = IconMap[config.iconName] || Plus;
                  return <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                    <Icon size={14} /> {config.label}
                  </button>
                })
              },
              {
                id: 'mythology',
                title: 'MITOLOGIA',
                subtitle: 'Deuses, panteões e cultos',
                icon: <Moon size={16} />,
                tools: ['deity', 'religion', 'cult'].map(key => {
                  const config = EntityConfig[key as EntityType];
                  const Icon = IconMap[config.iconName] || Plus;
                  return <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                    <Icon size={14} /> {config.label}
                  </button>
                })
              },
              {
                id: 'action',
                title: 'AÇÕES',
                subtitle: 'Estratégias, alianças e intrigas',
                icon: <Activity size={16} />,
                tools: ['strategy', 'stratagem', 'sabotage', 'alliance', 'assassination'].map(key => {
                  const config = EntityConfig[key as EntityType];
                  const Icon = IconMap[config.iconName] || Plus;
                  return <button key={key} draggable={true} onDragStart={(e) => { e.dataTransfer.setData('entityType', key); e.dataTransfer.setData('isGenealogy', 'false'); }} className="neon-btn" onClick={(e) => { e.stopPropagation(); handleAddNode(key as EntityType); }} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'grab' } as React.CSSProperties}>
                    <Icon size={14} /> {config.label}
                  </button>
                })
              }
            ].map(fw => (
              <div key={fw.id} style={{ 
                display: 'flex', flexDirection: 'column'
              }}>
                  <button 
                  className="aurum-btn"
                  onClick={() => setFramework(framework === fw.id ? null : fw.id as FrameworkMode)} 
                  style={{ 
                    padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    background: framework === fw.id ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)', 
                    color: framework === fw.id ? '#000000' : '#CCCCCC',
                    border: `1px solid ${framework === fw.id ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderBottomColor: framework === fw.id ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
                    borderRadius: framework === fw.id ? '8px 8px 0 0' : '8px',
                    width: '100%', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {fw.icon} <span style={{ fontWeight: 600, letterSpacing: '1px' }}>{fw.title}</span>
                  </div>
                </button>
                
                <div style={{ 
                  maxHeight: framework === fw.id ? '500px' : '0px', 
                  opacity: framework === fw.id ? 1 : 0, 
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.4)',
                  border: framework === fw.id ? '1px solid #FFFFFF' : 'none',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  marginBottom: '10px'
                }}>
                  <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {fw.tools}
                  </div>
                </div>
              </div>
            ))}
          </div>


        </div>

                {/* LAYERS MENU OVERLAY */}
        {isLayersPanelOpen && (
          <div style={{ 
            position: 'absolute', 
            bottom: '70px', 
            left: '24px', 
            right: '24px', 
            maxHeight: 'calc(100vh - 120px)',
            background: 'var(--bg-panel)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--gold-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} />
                <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: 700 }}>Camadas</h2>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
              {nodes.map(node => {
                const data = node.data;
                const config = EntityConfig[data.entityType || 'concept'];
                return (
                  <div key={node.id} onClick={() => {
                    setSelectedNodes([node.id]);
                    setCamera({ x: -node.position.x * camera.zoom + 200, y: -node.position.y * camera.zoom + window.innerHeight/2, zoom: camera.zoom });
                  }} style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: selectedNodes.includes(node.id) ? `${config.color}20` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${selectedNodes.includes(node.id) ? config.color : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</span>
                  </div>
                );
              })}
              {nodes.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                  Nenhum módulo criado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SYSTEM MENU OVERLAY */}
        {isSystemMenuOpen && (
          <div style={{ 
            position: 'absolute', 
            bottom: '70px', 
            left: '24px', 
            right: '24px', 
            background: 'var(--bg-panel)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
          }}>
             <button onClick={handleExport} className="aurum-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                <Download size={14} /> Baixar Projeto (.aurum)
             </button>
             
             <label className="aurum-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderColor: 'var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}>
                <Upload size={14} /> Importar Projeto
                <input type="file" accept=".aurum,.json" style={{ display: 'none' }} onChange={handleImport} />
             </label>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tema da Interface</span>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  style={{
                    background: 'var(--bg-core)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    padding: '6px',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    fontSize: '0.8rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="gold">Aurum Prime (Dourado)</option>
                  <option value="original">Cinzas do Atanor (Clássico)</option>
                  <option value="white">Alvorada (Claro)</option>
                  <option value="contrast">Abismo (Alto Contraste)</option>
                </select>
             </div>

             <button onClick={handleReset} className="aurum-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#ff444450', color: '#ff4444', marginTop: '8px' }}>
                <AlertTriangle size={14} /> Hard Reset
             </button>
          </div>
        )}

        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'color 0.2s' }}>
            <ImageIcon size={18} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '1px' }} className="hide-on-small">Fundo</span>
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  setBgImage(reader.result as string);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            {bgImage && (
               <button onClick={() => setBgImage(null)} title="Remover Fundo" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                 <Trash2 size={18} color="#ff4444" />
               </button>
            )}
            <Search size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
            <button onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} title="Camadas">
              <Layers size={18} color={isLayersPanelOpen ? "var(--gold-primary)" : "var(--text-muted)"} style={{ transition: 'color 0.2s' }} />
            </button>
            <button onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} title="Sistema">
              <Settings size={18} color={isSystemMenuOpen ? "var(--gold-primary)" : "var(--text-muted)"} style={{ transition: 'color 0.2s' }} />
            </button>
            <button onClick={() => setIsHelpOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} title="Manual da Engine">
              <HelpCircle size={18} color="var(--text-muted)" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--gold-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'} />
            </button>
          </div>
        </div>
      </aside>

      {/* Botão de Toggle do Painel Esquerdo */}
      <button 
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        style={{
          position: 'absolute',
          left: isLeftPanelOpen ? '300px' : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderLeft: 'none',
          color: 'var(--gold-primary)',
          padding: '16px 4px',
          cursor: 'pointer',
          borderRadius: '0 8px 8px 0',
          transition: 'left 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={isLeftPanelOpen ? "Recolher Painel" : "Expandir Painel"}
      >
        <div style={{ 
          width: '4px', 
          height: '24px', 
          background: 'var(--gold-primary)', 
          borderRadius: '2px',
          opacity: 0.8
        }} />
      </button>

      {/* CANVAS CENTRAL: O GRAFO - AURUM FLOW */}
      <main 
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
        onWheel={handleCanvasWheel}
        onContextMenu={handleContextMenu}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        onDoubleClick={(e) => {
          if (e.ctrlKey && e.altKey) {
            const marginX = 250;
            const marginY = 150;
            const itemsPerRow = Math.ceil(Math.sqrt(nodes.length));
            setNodes(nds => nds.map((n, i) => {
              const row = Math.floor(i / itemsPerRow);
              const col = i % itemsPerRow;
              return { ...n, position: { x: col * marginX, y: row * marginY } };
            }));
          }
        }}
        style={{ 
          flex: 1, 
          position: 'relative',
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: isSpaceDown ? (isDraggingCanvas ? 'grabbing' : 'grab') : (connectingNodeId ? 'crosshair' : 'default'),
          overflow: 'hidden'
        }}
      >
        {bgImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 0 }} />}
        
        {/* Dot pattern background (optional, simple CSS version) */}
        {!bgImage && (
          <div style={{ 
            position: 'absolute', inset: 0, 
            backgroundImage: `radial-gradient(var(--border-color) 1px, transparent 1px)`,
            backgroundSize: `${24 * camera.zoom}px ${24 * camera.zoom}px`,
            backgroundPosition: `${camera.x}px ${camera.y}px`,
            opacity: 0.3, pointerEvents: 'none'
          }} />
        )}

        <div style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          width: 0, height: 0,
        }}>
          {/* Edges Layer */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '10000px', height: '10000px', pointerEvents: 'none', overflow: 'visible' }}>
             {edges.map(e => {
               const { p1, p2 } = getEdgeAnchors(e.source, e.target, null);
               return (
                 <path 
                   key={e.id}
                   d={drawBezier(p1, p2)}
                   fill="none"
                   stroke="var(--gold-primary)"
                   strokeWidth={2 / camera.zoom}
                   opacity={0.6}
                 />
               )
             })}
             
             {/* Active Connecting Edge */}
             {connectingNodeId && (() => {
                const { p1, p2 } = getEdgeAnchors(connectingNodeId, null, mousePos);
                return (
                 <path 
                   d={drawBezier(p1, p2)}
                   fill="none"
                   stroke="var(--gold-primary)"
                   strokeWidth={2 / camera.zoom}
                   strokeDasharray="5,5"
                   opacity={0.8}
                 />
                );
             })()}
          </svg>

          
          {selectionBox && (
            <div style={{
              position: 'absolute',
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
              border: '1px solid var(--gold-primary)',
              background: 'rgba(212, 175, 55, 0.1)',
              pointerEvents: 'none',
              zIndex: 100
            }} />
          )}

          {/* Nodes Layer */}
          {nodes.map(n => (
            <div 
              key={n.id}
              className="aurum-node"
              data-id={n.id}
              ref={el => nodeRefs.current[n.id] = el}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsInspectorOpen(true);
              }}
              onPointerDown={e => {
                if (e.button === 2) {
                   handleContextMenu(e as unknown as React.MouseEvent);
                   return;
                }
                handleNodePointerDown(e, n);
              }}
              onPointerMove={e => handleNodePointerMove(e, n.id)}
              onPointerUp={(e) => handleNodePointerUp(e, n.id)}
              style={{
                position: 'absolute',
                left: n.position.x,
                top: n.position.y,
                cursor: connectingNodeId ? 'crosshair' : draggedNodeId === n.id ? 'grabbing' : 'grab',
                zIndex: selectedNodes.includes(n.id) ? 10 : 1,
                userSelect: 'none'
              }}
            >
              {n.type === 'genealogy' ? (
                <GenealogyNode 
                    data={n.data} 
                    selected={selectedNodes.includes(n.id)} 
                    onConnectStart={(e) => startConnection(e as unknown as React.PointerEvent, n.id)}
                    nodeId={n.id} 
                    width={n.width}
                    height={n.height}
                    onPreview={(tab) => { setPreviewNode(n.data); setPreviewTab(tab); }}
                    onEdit={() => { setSelectedNodes([n.id]); setIsInspectorOpen(true); }}
                    onDelete={() => {
                      setNodes(prev => prev.filter(node => node.id !== n.id));
                      setEdges(prev => prev.filter(edge => edge.source !== n.id && edge.target !== n.id));
                      if (selectedNodes.includes(n.id)) {
                        setSelectedNodes(selectedNodes.filter(id => id !== n.id));
                        setIsInspectorOpen(false);
                      }
                    }}
                />
              ) : (
                <CustomNode 
                    data={n.data} 
                    selected={selectedNodes.includes(n.id)} 
                    onConnectStart={(e) => startConnection(e as unknown as React.PointerEvent, n.id)}
                    nodeId={n.id} 
                    width={n.width}
                    height={n.height}
                    onPreview={(tab) => { setPreviewNode(n.data); setPreviewTab(tab); }}
                    onEdit={() => { setSelectedNodes([n.id]); setIsInspectorOpen(true); }}
                    onDelete={() => {
                      setNodes(prev => prev.filter(node => node.id !== n.id));
                      setEdges(prev => prev.filter(edge => edge.source !== n.id && edge.target !== n.id));
                      if (selectedNodes.includes(n.id)) {
                        setSelectedNodes(selectedNodes.filter(id => id !== n.id));
                        setIsInspectorOpen(false);
                      }
                    }}
                />
              )}
            </div>
          ))}
        </div>
      




      </main>

      {/* CONTEXT MENU (RIGHT CLICK) */}
      {contextMenu && (
        <div style={{
          position: 'absolute',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 1000,
          background: 'var(--bg-panel)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '200px'
        }}>
          {contextMenu.nodeId ? (
            <>
              <div style={{ padding: '4px 8px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Ações da Entidade</div>
              <button 
                className="aurum-btn"
                onClick={() => {
                  setNodes(prev => prev.filter(n => n.id !== contextMenu.nodeId));
                  setEdges(prev => prev.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId));
                  if (contextMenu.nodeId && selectedNodes.includes(contextMenu.nodeId)) setSelectedNodes([]);
                  closeContextMenu();
                }}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', color: '#E45B5B', borderColor: 'transparent', background: 'transparent' }}
              >
                <Trash2 size={14} /> Excluir Entidade
              </button>
            </>
          ) : (
            <>
              <div style={{ padding: '4px 8px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Criar Entidade Aqui</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                
                {[
                  { id: 'core', title: 'MUNDO', icon: <Box size={14} />, entities: ['location', 'organization', 'event', 'object', 'artifact', 'concept', 'lore'] },
                  { id: 'genealogy', title: 'ENTIDADES', icon: <Network size={14} />, custom: [
                    { key: 'member', label: 'Personagem', color: '#00E5FF', handler: () => handleAddGenealogyNode('member', contextMenu.canvasPos) },
                    { key: 'group', label: 'Facção', color: '#00E5FF', handler: () => handleAddGenealogyNode('group', contextMenu.canvasPos) },
                    { key: 'company', label: 'Empresa', color: '#00E5FF', handler: () => handleAddGenealogyNode('company', contextMenu.canvasPos) },
                    { key: 'clan', label: 'Clã', color: '#00E5FF', handler: () => handleAddGenealogyNode('clan', contextMenu.canvasPos) },
                    { key: 'family', label: 'Família', color: '#00E5FF', handler: () => handleAddGenealogyNode('family', contextMenu.canvasPos) },
                    { key: 'guild', label: 'Guilda', color: '#00E5FF', handler: () => handleAddGenealogyNode('guild', contextMenu.canvasPos) },
                    { key: 'government', label: 'Governo', color: '#00E5FF', handler: () => handleAddGenealogyNode('government', contextMenu.canvasPos) },
                    { key: 'order', label: 'Ordem', color: '#00E5FF', handler: () => handleAddGenealogyNode('order', contextMenu.canvasPos) }
                  ]},
                  { id: 'timeline', title: 'CRONOLOGIA', icon: <Clock size={14} />, entities: ['era', 'epoch', 'historical_event'] },
                  { id: 'plot', title: 'NARRATIVA', icon: <Target size={14} />, entities: ['quest', 'plot', 'conflict'] },
                  { id: 'magic', title: 'PODERES', icon: <Sparkles size={14} />, entities: ['spell', 'skill', 'technology'] },
                  { id: 'geography', title: 'GEOGRAFIA', icon: <Map size={14} />, entities: ['territory', 'biome'] },
                  { id: 'mythology', title: 'MITOLOGIA', icon: <Moon size={14} />, entities: ['deity', 'religion', 'cult'] },
                  { id: 'action', title: 'AÇÕES', icon: <Activity size={14} />, entities: ['strategy', 'stratagem', 'sabotage', 'alliance', 'assassination'] }
                ].map(folder => {
                  const isActive = activeContextFolder === folder.id;
                  return (
                    <div 
                      key={folder.id} 
                      style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: isActive ? 'rgba(0,0,0,0.3)' : 'transparent', borderRadius: '6px' }}
                      onMouseEnter={() => setActiveContextFolder(folder.id)}
                      onMouseLeave={() => setActiveContextFolder(null)}
                    >
                      <button 
                        style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', 
                          background: 'transparent', border: 'none', padding: '8px 10px', color: isActive ? 'var(--gold-primary)' : 'var(--text-main)',
                          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {folder.icon} {folder.title}
                        </div>
                        <div>
                          <ChevronRight size={14} />
                        </div>
                      </button>
                      
                      {isActive && (
                        <div style={{ 
                          position: 'absolute', 
                          left: '100%', 
                          top: 0, 
                          marginLeft: '4px',
                          background: 'var(--bg-panel)', 
                          backdropFilter: 'blur(12px)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: '4px',
                          minWidth: '160px',
                          zIndex: 1001
                        }}>
                          {folder.custom ? folder.custom.map(c => (
                            <button key={c.key} className="neon-btn" onClick={c.handler} style={{ '--neon-color': c.color, '--neon-dim': `${c.color}40`, textAlign: 'left', padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px' } as React.CSSProperties}>+ {c.label}</button>
                          )) : folder.entities?.map(key => {
                            const config = EntityConfig[key as EntityType];
                            return <button key={key} className="neon-btn" onClick={() => handleAddNode(key as EntityType, contextMenu.canvasPos)} style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, textAlign: 'left', padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px' } as React.CSSProperties}>+ {config.label}</button>
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* MANUAL DA ENGINE (HELP MODAL) */}
      {isHelpOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setIsHelpOpen(false)}>
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <HelpCircle color="var(--gold-primary)" size={24} />
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--gold-primary)' }}>Manual de Sobrevivência: Aurum Engine</h2>
              <button onClick={() => setIsHelpOpen(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              
              <div>
                <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '8px' }}>Navegação pelo Universo</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)' }}>
                  <li><strong>Mover a Câmera:</strong> Clique com o botão do meio do mouse e arraste, ou clique em qualquer espaço vazio do fundo e arraste.</li>
                  <li><strong>Zoom:</strong> Gire a rodinha do mouse (scroll) para aproximar ou afastar.</li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '8px' }}>Gerenciamento de Entidades</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)' }}>
                  <li><strong>Criar:</strong> Use o menu lateral esquerdo, ou clique com o <strong>botão direito</strong> no espaço vazio para criar algo exatamente onde clicou.</li>
                  <li><strong>Mover:</strong> Clique num bloco e arraste.</li>
                  <li><strong>Redimensionar:</strong> Segure <strong>Ctrl</strong> (ou Cmd) e arraste o bloco para aumentar a largura e altura.</li>
                  <li><strong>Conectar:</strong> Clique nos pontos (bolinhas) laterais do bloco e arraste até outro bloco para formar um link.</li>
                  <li><strong>Excluir:</strong> Selecione o bloco (ou linha) e aperte <strong>Delete/Backspace</strong>, ou use o clique direito.</li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '8px' }}>Seleção e Inspetor</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)' }}>
                  <li><strong>Selecionar um:</strong> Clique simples sobre o bloco.</li>
                  <li><strong>Selecionar vários:</strong> Segure <strong>Shift</strong> e vá clicando nos blocos desejados (ou arraste criando uma caixa de seleção pelo fundo usando Shift).</li>
                  <li><strong>Editar Propriedades (Inspetor):</strong> Dê um <strong>Clique Duplo</strong> no bloco para abrir o painel lateral direito. Lá você edita nomes, descrições, status e imagens.</li>
                </ul>
              </div>
              
              <div style={{ background: 'var(--gold-primary)20', border: '1px solid var(--gold-primary)40', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--gold-primary)', display: 'block', marginBottom: '4px' }}>Dica de Ouro: Salvamento</strong>
                O seu projeto é salvo temporariamente no navegador (anti-desastres). Mas lembre-se sempre de exportar o arquivo <strong>.aurum</strong> (na Engrenagem &gt; Salvar Universo Local) para guardar definitivamente seu mundo!
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PAINEL DIREITO: INSPETOR E DETALHES */}
      <aside className="glass-panel" style={{ 
        width: '320px', 
        height: '100%', 
        zIndex: 10, 
        padding: '24px', 
        borderLeft: '1px solid var(--border-color)',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        transform: (selectedNodes.length > 0 && isInspectorOpen) ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
        position: 'absolute',
        right: 0
      }}>
        {selectedNodes.length > 0 ? (() => {
          const selectedNode = nodes.find(n => n.id === selectedNodes[0]);
          if (!selectedNode) return null;
          const data = selectedNode.data;
          const config = EntityConfig[data.entityType || 'concept'];
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', background: `${config.color}20`, color: config.color }}>
                  <Box size={18} />
                </div>
                <h2 style={{ fontSize: '0.8rem', color: config.color, textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
                  {config.label}
                </h2>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Nome da Entidade</label>
                <input 
                  type="text" 
                  value={data.label} 
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, label: newLabel } } : n));
                    
                  }}
                  style={{ 
                    width: '100%', 
                    background: 'rgba(0,0,0,0.5)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-main)',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontFamily: 'Outfit',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              {(selectedNode?.type === 'genealogy') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Status Atual</label>
                  <select 
                    value={data.status || 'alive'}
                    onChange={(e) => {
                      const newStatus = e.target.value as CharacterStatus;
                      setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, status: newStatus } } : n));
                      
                    }}
                    style={{
                      width: '100%', 
                      background: 'rgba(0,0,0,0.5)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-main)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontFamily: 'Outfit',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="alive">Vivo</option>
                    <option value="dead">Morto</option>
                    <option value="missing">Desaparecido</option>
                    <option value="exiled">Exilado</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Tipo de Entidade</label>
                <select 
                  value={data.entityType}
                  onChange={(e) => {
                    const newType = e.target.value as EntityType;
                    setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, entityType: newType } } : n));
                    
                  }}
                  style={{
                    width: '100%', 
                    background: 'rgba(0,0,0,0.5)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-main)',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontFamily: 'Outfit',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {Object.entries(EntityConfig).map(([key, c]) => (
                    <option key={key} value={key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Imagem do Nó</label>
                
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <input 
                    type="text" 
                    value={data.imageUrl || ''} 
                    placeholder="URL da Imagem (https://...)"
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, imageUrl: newUrl } } : n));
                      
                    }}
                    style={{ 
                      width: '100%', 
                      background: 'rgba(0,0,0,0.5)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-main)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontFamily: 'Outfit',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OU</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                  </div>

                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px dashed var(--gold-primary)',
                      color: 'var(--gold-primary)',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: 600
                    }}
                  >
                    Upload Local (Arquivo)
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, imageUrl: base64String } } : n));
                          
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>URL do Modelo 3D (Opcional)</label>
                <input 
                  type="text" 
                  value={data.model3dUrl || ''}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, model3dUrl: newUrl } } : n));
                  }}
                  placeholder="https://my-3d-model.glb"
                  style={{ 
                    width: '100%', 
                    background: 'rgba(0,0,0,0.5)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-main)',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontFamily: 'Outfit',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px', flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Descrição / Lore</label>
                <textarea 
                  value={data.description || ''}
                  onChange={(e) => {
                    const newDesc = e.target.value;
                    setNodes(nds => nds.map(n => n.id === selectedNodes[0] ? { ...n, data: { ...n.data, description: newDesc } } : n));
                    
                  }}
                  placeholder="Insira os detalhes, história e contexto..."
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    minHeight: '200px',
                    background: 'rgba(0,0,0,0.5)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-main)',
                    padding: '12px',
                    borderRadius: '6px',
                    fontFamily: 'Outfit',
                    fontSize: '0.85rem',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: '1.5'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                 <button className="aurum-btn" onClick={handleDeleteNode} style={{ flex: 1, borderColor: '#ff4444', color: '#ff4444' }}>
                  <Trash2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  Deletar Nó
                 </button>
              </div>
            </div>
          );
        })() : <div></div>}
      </aside>

      {/* PREVIEW MODAL */}
      {previewNode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setPreviewNode(null)}
        >
          <div style={{
            width: '90%',
            height: '90%',
            maxWidth: '1200px',
            background: 'var(--bg-panel)',
            border: `1px solid ${EntityConfig[previewNode.entityType]?.color || 'var(--gold-primary)'}`,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: `0 0 40px ${EntityConfig[previewNode.entityType]?.color || 'var(--gold-primary)'}40`
          }}
          onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0,0,0,0.4)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {previewNode.label}
                </h2>
                <span style={{ 
                  color: EntityConfig[previewNode.entityType]?.color || 'var(--text-muted)', 
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 600
                }}>
                  {EntityConfig[previewNode.entityType]?.label}
                </span>
              </div>
              <button onClick={() => setPreviewNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body & Tabs */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              

              {/* Content Area */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-core)' }}>
                {previewTab === 'visual' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {previewNode.imageUrl ? (
                      <img src={previewNode.imageUrl} alt={previewNode.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <ImageIcon size={48} opacity={0.2} />
                        <p>Nenhuma imagem disponível para esta entidade.</p>
                      </div>
                    )}
                  </div>
                )}

                {previewTab === 'text' && (
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {previewNode.description ? (
                      <p style={{ color: 'var(--text-main)', lineHeight: '1.8', fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>
                        {previewNode.description}
                      </p>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma lore ou descrição disponível.</p>
                    )}
                  </div>
                )}

                {previewTab === '3d' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {previewNode.model3dUrl ? (
                       <iframe 
                         src={previewNode.model3dUrl} 
                         style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                         allow="autoplay; fullscreen; vr"
                       />
                    ) : (
                      <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Box size={48} opacity={0.2} />
                        <p>Nenhum modelo 3D vinculado.</p>
                        <span style={{ fontSize: '0.8rem' }}>Adicione a URL do modelo no painel do Inspetor. Suporta embeds como Sketchfab/Spline.</span>
                      </div>
                    )}
                  </div>
                )}

                {previewTab === 'tech' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>Dados Brutos (JSON)</h3>
                    <pre style={{ 
                      background: 'rgba(0,0,0,0.5)', 
                      padding: '20px', 
                      borderRadius: '8px', 
                      color: '#00ffcc',
                      overflowX: 'auto',
                      border: '1px solid var(--border-color)',
                      flex: 1
                    }}>
                      {JSON.stringify(previewNode, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

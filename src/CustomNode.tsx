import React, { useState } from 'react';
import { User, MapPin, Shield, Calendar, Sword, BookOpen, Hourglass, Flag, Target, Swords, Sparkles, Cpu, Map, Leaf, Sun, Flame, Eye, Pencil, Trash2, Image as ImageIcon, FileText, Box, Code, Clock, Zap, Book, Bomb, Link, Skull, Lightbulb, GitMerge, Briefcase, Landmark, Users, Hammer, Cross, Network } from 'lucide-react';
import { EntityConfig, EntityType, AurumNodeData } from './types';

export const IconMap: Record<string, React.ElementType> = {
  'user': User,
  'map-pin': MapPin,
  'shield': Shield,
  'calendar': Calendar,
  'sword': Sword,
  'book-open': BookOpen,
  'hourglass': Hourglass,
  'flag': Flag,
  'target': Target,
  'swords': Swords,
  'sparkles': Sparkles,
  'cpu': Cpu,
  'map': Map,
  'leaf': Leaf,
  'sun': Sun,
  'flame': Flame,
  'box': Box,
  'lightbulb': Lightbulb,
  'clock': Clock,
  'git-merge': GitMerge,
  'zap': Zap,
  'book': Book,
  'eye': Eye,
  'bomb': Bomb,
  'handshake': Link,
  'skull': Skull,
  'briefcase': Briefcase,
  'landmark': Landmark,
  'users': Users,
  'hammer': Hammer,
  'cross': Cross,
  'network': Network,
};

interface CustomNodeProps {
  data: AurumNodeData;
  selected?: boolean;
  onConnectStart: (e: React.PointerEvent) => void;
  nodeId: string;
  width?: number;
  height?: number;
  onPreview?: (tab: 'visual'|'text'|'3d'|'tech') => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CustomNodeBase = ({ data, selected, onConnectStart, width = 250, height, onPreview, onEdit, onDelete }: CustomNodeProps) => {
  const entityType: EntityType = data.entityType || 'concept';
  const config = EntityConfig[entityType];
  const Icon = IconMap[config.iconName] || BookOpen;
  
  const [isEyeMenuOpen, setIsEyeMenuOpen] = useState(false);

  return (
    <div 
      className={`neon-node ${selected ? 'selected' : ''}`}
      style={{
        '--neon-color': config.color,
        '--neon-dim': `${config.color}40`,
        background: `linear-gradient(180deg, ${config.color}30 0%, ${config.color}05 100%), #0a0a0a`,
        borderRadius: '8px',
        padding: '0',
        minWidth: '150px',
        width: width ? `${width}px` : '150px',
        height: height ? `${height}px` : 'auto',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-main)',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
      } as React.CSSProperties}>
      <div style={{ 
        background: `linear-gradient(180deg, ${config.color}30 0%, transparent 100%)`, 
        padding: data.imageUrl ? '0' : '12px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderBottom: `1px solid ${config.color}30`,
        borderTopLeftRadius: '7px',
        borderTopRightRadius: '7px',
        height: '100px',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Icon size={32} color={config.color} />
        )}
      </div>
      
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, pointerEvents: 'none' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: '8px' }}>
          {data.label}
        </span>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          background: `${config.color}20`,
          color: config.color,
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: 600
        }}>
          <Icon size={12} />
          {config.label}
        </div>
      </div>

      {/* Handles (Pontos de Conexão) */}
      {/* Right */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', top: '50%', right: '-14px', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${config.color}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Direita"
      />
      {/* Left */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', top: '50%', left: '-14px', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${config.color}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Esquerda"
      />
      {/* Top */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${config.color}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Acima"
      />
      {/* Bottom */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${config.color}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Abaixo"
      />
       {/* Hidden edge connection points for CustomNode */}
      {/* Action Buttons Toolbar */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px',
          borderTop: `1px solid ${config.color}30`,
          background: 'rgba(0,0,0,0.2)',
          borderBottomLeftRadius: '7px',
          borderBottomRightRadius: '7px',
          zIndex: 20,
          position: 'relative'
        }}
      >
        {/* Eye Menu Panel */}
        {isEyeMenuOpen && (
           <div style={{
             position: 'absolute',
             top: '100%',
             left: '50%',
             transform: 'translateX(-50%)',
             marginTop: '8px',
             background: 'var(--bg-panel)',
             border: '1px solid var(--border-color)',
             borderRadius: '8px',
             padding: '4px',
             display: 'flex',
             flexDirection: 'column',
             gap: '4px',
             boxShadow: '0 8px 16px rgba(0,0,0,0.8)',
             backdropFilter: 'blur(10px)',
             minWidth: '120px'
           }}>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('visual'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <ImageIcon size={12} /> Visual
             </button>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('text'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <FileText size={12} /> Lore
             </button>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('3d'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <Box size={12} /> 3D Model
             </button>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('tech'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': config.color, '--neon-dim': `${config.color}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <Code size={12} /> Tech Info
             </button>
           </div>
        )}

        {onPreview && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); setIsEyeMenuOpen(!isEyeMenuOpen); }}
            style={{
              background: isEyeMenuOpen ? config.color : 'rgba(0,0,0,0.6)',
              border: `1px solid ${config.color}`,
              borderRadius: '6px',
              color: isEyeMenuOpen ? '#000' : 'var(--text-main)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: isEyeMenuOpen ? `0 0 10px ${config.color}` : 'none'
            }}
            title="Preview"
          >
            <Eye size={14} />
          </button>
        )}
        
        {onEdit && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${config.color}`,
              borderRadius: '6px',
              color: 'var(--text-main)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            title="Editar (Inspetor)"
          >
            <Pencil size={14} />
          </button>
        )}
        
        {onDelete && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${config.color}`,
              borderRadius: '6px',
              color: '#ff4444',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,68,68,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

    </div>
  );
};

export default React.memo(CustomNodeBase, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.data === next.data
  );
});

import React, { useState } from 'react';
import { User, Skull, HelpCircle, ArrowRight, Pencil, Trash2, Eye, Image as ImageIcon, FileText, Box, Code } from 'lucide-react';
import { IconMap } from './CustomNode';
import { AurumNodeData, CharacterStatus } from './types';

const StatusConfig: Record<CharacterStatus, { color: string, icon: any, label: string }> = {
  alive: { color: '#00FF7F', icon: User, label: 'Vivo' },
  dead: { color: '#FF003C', icon: Skull, label: 'Morto' },
  missing: { color: '#FFEA00', icon: HelpCircle, label: 'Desaparecido' },
  exiled: { color: '#D942FF', icon: ArrowRight, label: 'Exilado' },
};

interface GenealogyNodeProps {
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

const GenealogyNodeBase = ({ data, selected, onConnectStart, width, height, onPreview, onEdit, onDelete }: GenealogyNodeProps) => {
  const status = data.status || 'alive';
  const conf = StatusConfig[status];
  const StatusIcon = conf.icon;
  const baseColor = '#00E5FF';

  const [isEyeMenuOpen, setIsEyeMenuOpen] = useState(false);

  return (
    <div 
      className={`neon-node ${selected ? 'selected' : ''}`}
      style={{
        '--neon-color': baseColor,
        '--neon-dim': `${baseColor}40`,
        background: `linear-gradient(180deg, ${baseColor}30 0%, ${baseColor}05 100%), #0a0a0a`,
        borderRadius: '8px',
        padding: '0',
        minWidth: '160px',
        width: width ? `${width}px` : 'max-content',
        height: height ? `${height}px` : 'auto',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-main)',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
      } as React.CSSProperties}>
      <div style={{ 
        background: `linear-gradient(180deg, ${baseColor}30 0%, transparent 100%)`, 
        padding: data.imageUrl ? '0' : '12px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderBottom: `1px solid ${baseColor}30`,
        borderTopLeftRadius: '7px',
        borderTopRightRadius: '7px',
        height: '100px',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative'
      }}>
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (() => {
          const NodeIcon = (data.iconName && IconMap[data.iconName]) ? IconMap[data.iconName] : User;
          return <NodeIcon size={32} color={baseColor} />;
        })()}
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: '8px', pointerEvents: 'none' }}>
          {data.label}
        </span>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          background: `${conf.color}20`,
          color: conf.color,
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          fontWeight: 800,
          pointerEvents: 'none'
        }}>
          <StatusIcon size={10} />
          {conf.label}
        </div>
      </div>

      {/* Handles (Pontos de Conexão) */}
      {/* Top */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${baseColor}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Acima"
      />
      {/* Bottom */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${baseColor}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Abaixo"
      />
      {/* Right */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', top: '50%', right: '-14px', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${baseColor}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Direita"
      />
      {/* Left */}
      <div 
        onPointerDown={onConnectStart}
        style={{ position: 'absolute', top: '50%', left: '-14px', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: `2px solid ${baseColor}`, cursor: 'crosshair', zIndex: 10 }}
        title="Conectar Esquerda"
      />

      {/* Action Buttons Toolbar */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px',
          borderTop: `1px solid ${baseColor}30`,
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
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('visual'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': baseColor, '--neon-dim': `${baseColor}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <ImageIcon size={12} /> Visual
             </button>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('text'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': baseColor, '--neon-dim': `${baseColor}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <FileText size={12} /> Lore
             </button>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('3d'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': baseColor, '--neon-dim': `${baseColor}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <Box size={12} /> 3D Model
             </button>
             <button onClick={(e) => { e.stopPropagation(); onPreview && onPreview('tech'); setIsEyeMenuOpen(false); }} className="neon-btn" style={{ '--neon-color': baseColor, '--neon-dim': `${baseColor}40`, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties}>
               <Code size={12} /> Tech Info
             </button>
           </div>
        )}

        {onPreview && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); setIsEyeMenuOpen(!isEyeMenuOpen); }}
            style={{
              background: isEyeMenuOpen ? baseColor : 'rgba(0,0,0,0.6)',
              border: `1px solid ${baseColor}`,
              borderRadius: '6px',
              color: isEyeMenuOpen ? '#000' : 'var(--text-main)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: isEyeMenuOpen ? `0 0 10px ${baseColor}` : 'none'
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
              border: `1px solid ${baseColor}`,
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
              border: `1px solid ${baseColor}`,
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

export default React.memo(GenealogyNodeBase, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.data === next.data
  );
});

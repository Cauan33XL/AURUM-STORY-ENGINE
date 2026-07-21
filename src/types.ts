export type EntityType = 
  | 'character' 
  | 'location' 
  | 'organization' 
  | 'event' 
  | 'object' 
  | 'concept'
  // Novos tipos
  | 'era'
  | 'epoch'
  | 'historical_event'
  | 'quest'
  | 'plot'
  | 'conflict'
  | 'spell'
  | 'skill'
  | 'technology'
  | 'territory'
  | 'biome'
  | 'deity'
  | 'religion'
  | 'cult'
  | 'artifact'
  | 'lore'
  // Actions
  | 'strategy'
  | 'stratagem'
  | 'sabotage'
  | 'alliance'
  | 'assassination';

export type FrameworkMode = 'core' | 'genealogy' | 'timeline' | 'plot' | 'magic' | 'geography' | 'mythology' | 'action';
export type CharacterStatus = 'alive' | 'dead' | 'missing' | 'exiled';

export interface AurumNodeData {
  label: string;
  description?: string;
  imageUrl?: string;
  model3dUrl?: string;
  entityType: EntityType;
  status?: CharacterStatus;
  [key: string]: any; // Para campos customizados futuros
}

export interface AurumNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  data: AurumNodeData;
}

export interface AurumEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export const EntityConfig: Record<EntityType, { label: string; color: string; iconName: string }> = {
  // Core
  character: { label: 'Personagem', color: '#39FF14', iconName: 'user' },
  location: { label: 'Local', color: '#39FF14', iconName: 'map-pin' },
  organization: { label: 'Organização', color: '#39FF14', iconName: 'shield' },
  event: { label: 'Evento', color: '#39FF14', iconName: 'calendar' },
  object: { label: 'Objeto', color: '#39FF14', iconName: 'box' },
  artifact: { label: 'Artefato', color: '#39FF14', iconName: 'sword' },
  concept: { label: 'Conceito', color: '#39FF14', iconName: 'lightbulb' },
  lore: { label: 'Lore', color: '#39FF14', iconName: 'book-open' },
  // Timeline
  era: { label: 'Era', color: '#FFF000', iconName: 'hourglass' },
  epoch: { label: 'Época', color: '#FFF000', iconName: 'clock' },
  historical_event: { label: 'Marco', color: '#FFF000', iconName: 'flag' },
  // Plot
  quest: { label: 'Missão', color: '#FF0033', iconName: 'target' },
  plot: { label: 'Trama', color: '#FF0033', iconName: 'git-merge' },
  conflict: { label: 'Conflito', color: '#FF0033', iconName: 'swords' },
  // Magic/Tech
  spell: { label: 'Magia', color: '#D500FF', iconName: 'sparkles' },
  skill: { label: 'Habilidade', color: '#D500FF', iconName: 'zap' },
  technology: { label: 'Tecnologia', color: '#D500FF', iconName: 'cpu' },
  // Geography
  territory: { label: 'Território', color: '#FF6600', iconName: 'map' },
  biome: { label: 'Bioma', color: '#FF6600', iconName: 'leaf' },
  // Mythology
  deity: { label: 'Divindade', color: '#4D4DFF', iconName: 'sun' },
  religion: { label: 'Religião', color: '#4D4DFF', iconName: 'book' },
  cult: { label: 'Culto', color: '#4D4DFF', iconName: 'flame' }, // Ethereal Blue
  // Actions
  strategy: { label: 'Estratégia', color: '#FF1493', iconName: 'map' },
  stratagem: { label: 'Estratagema', color: '#FF1493', iconName: 'eye' },
  sabotage: { label: 'Sabotagem', color: '#FF1493', iconName: 'bomb' },
  alliance: { label: 'Aliança', color: '#FF1493', iconName: 'handshake' },
  assassination: { label: 'Atentado', color: '#FF1493', iconName: 'skull' }
};

export type TileType = 'bamboo' | 'character' | 'dot' | 'dragon' | 'wind';
export type DragonType = 'red' | 'green' | 'white';
export type WindType = 'east' | 'south' | 'west' | 'north';

export interface Tile {
  id: string;
  type: TileType;
  value?: number; // 1-9 for bamboo, character, dot
  dragon?: DragonType;
  wind?: WindType;
  unicode: string;
}

export interface DiscardedTile {
  tile: Tile;
  playerId: string;
  playerName: string;
  turnNumber: number;
}

export interface Player {
  id: string;
  name: string;
  hand: Tile[];
  exposedSets: Tile[][];
  score: number;
  isDealer: boolean;
  isBot: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  wall: Tile[];
  discardPile: DiscardedTile[];
  round: number;
  gamePhase: 'setup' | 'playing' | 'finished';
  winner?: string;
  turnNumber: number;
  drawReason?: 'riichi-declared' | 'wall-exhausted-winner' | 'wall-exhausted-draw';
}
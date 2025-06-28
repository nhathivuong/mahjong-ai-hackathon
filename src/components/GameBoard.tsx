import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Tile, DiscardedTile } from '../types/mahjong';
import { 
  createTileSet, 
  shuffleTiles, 
  sortTiles, 
  isWinningHand, 
  canFormChow, 
  canFormPung, 
  canFormKong,
  calculateWinScore,
  checkDrawCondition,
  calculateDrawScores,
  isOneAwayFromWin
} from '../utils/tileUtils';
import { SoundManager } from '../utils/soundUtils';
import TileComponent from './TileComponent';
import DiscardHistory from './DiscardHistory';
import BotActionIndicator, { BotActionType } from './BotActionIndicator';
import { Volume2, VolumeX, RotateCcw, Trophy, Users, Clock, Eye, X } from 'lucide-react';

interface GameBoardProps {
  gameMode: 'bot' | 'multiplayer';
}

interface BotAction {
  type: BotActionType;
  playerName: string;
  tiles?: Tile[];
}

interface ClaimOption {
  type: 'chow' | 'pung' | 'kong' | 'win';
  tiles: Tile[];
  discardedTile: Tile;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameMode }) => {
  // ... [rest of the component code remains exactly the same]
};

export default GameBoard;
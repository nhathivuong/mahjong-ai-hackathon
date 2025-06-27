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
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [botAction, setBotAction] = useState<BotAction | null>(null);
  const [isFirstMove, setIsFirstMove] = useState(true);
  const [claimOptions, setClaimOptions] = useState<ClaimOption[]>([]);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<DiscardedTile | null>(null);
  const soundManager = SoundManager.getInstance();

  // Initialize game
  const initializeGame = useCallback(() => {
    const tiles = shuffleTiles(createTileSet());
    
    const players: Player[] = [
      {
        id: 'player1',
        name: 'You',
        hand: sortTiles(tiles.slice(0, 13)),
        exposedSets: [],
        score: 0,
        isDealer: true,
        isBot: false
      },
      {
        id: 'bot1',
        name: 'East Bot',
        hand: tiles.slice(13, 26),
        exposedSets: [],
        score: 0,
        isDealer: false,
        isBot: true
      },
      {
        id: 'bot2',
        name: 'North Bot',
        hand: tiles.slice(26, 39),
        exposedSets: [],
        score: 0,
        isDealer: false,
        isBot: true
      },
      {
        id: 'bot3',
        name: 'West Bot',
        hand: tiles.slice(39, 52),
        exposedSets: [],
        score: 0,
        isDealer: false,
        isBot: true
      }
    ];

    // Give the dealer (player1) an extra tile
    players[0].hand.push(tiles[52]);
    players[0].hand = sortTiles(players[0].hand);

    const newGameState: GameState = {
      players,
      currentPlayer: 0,
      wall: tiles.slice(53),
      discardPile: [],
      round: 1,
      gamePhase: 'playing',
      turnNumber: 1,
      lastActionWasClaim: false // Initialize claim flag
    };

    setGameState(newGameState);
    setIsFirstMove(true);
    setClaimOptions([]);
    setShowClaimDialog(false);
    setPendingDiscard(null);
    soundManager.playTransitionSound('game-start');
  }, [soundManager]);

  // Initialize game on component mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Update sound settings
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled, soundManager]);

  // Show bot action indicator with full tile objects
  const showBotAction = (action: BotActionType, playerName: string, tiles?: Tile[]) => {
    setBotAction({ type: action, playerName, tiles });
  };

  // Helper function to remove claimed tile from discard pile
  const removeClaimedTileFromDiscardPile = (discardPile: DiscardedTile[], claimedTile: Tile): DiscardedTile[] => {
    const updatedDiscardPile = [...discardPile];
    for (let i = updatedDiscardPile.length - 1; i >= 0; i--) {
      const discardedTile = updatedDiscardPile[i];
      if (discardedTile.tile.type === claimedTile.type &&
          discardedTile.tile.value === claimedTile.value &&
          discardedTile.tile.dragon === claimedTile.dragon &&
          discardedTile.tile.wind === claimedTile.wind) {
        updatedDiscardPile.splice(i, 1);
        break;
      }
    }
    return updatedDiscardPile;
  };

  // Check if player can claim the discarded tile
  const checkPlayerClaims = (gameState: GameState, discardedTile: DiscardedTile): ClaimOption[] => {
    const player = gameState.players[0]; // Human player
    const options: ClaimOption[] = [];
    
    // Don't allow claiming own discards
    if (discardedTile.playerId === player.id) return options;

    // Check for win first (highest priority)
    const testHand = [...player.hand, discardedTile.tile];
    if (isWinningHand(testHand, player.exposedSets)) {
      options.push({
        type: 'win',
        tiles: [discardedTile.tile],
        discardedTile: discardedTile.tile
      });
    }

    // Check for kong (second priority)
    const kongTiles = canFormKong(player.hand, discardedTile.tile);
    if (kongTiles) {
      options.push({
        type: 'kong',
        tiles: [discardedTile.tile, ...kongTiles],
        discardedTile: discardedTile.tile
      });
    }

    // Check for pung (third priority)
    const pungTiles = canFormPung(player.hand, discardedTile.tile);
    if (pungTiles) {
      options.push({
        type: 'pung',
        tiles: [discardedTile.tile, ...pungTiles],
        discardedTile: discardedTile.tile
      });
    }

    // Check for chow (lowest priority, only from previous player)
    const currentPlayerIndex = gameState.currentPlayer;
    const discardingPlayerIndex = gameState.players.findIndex(p => p.id === discardedTile.playerId);
    const nextPlayerIndex = (discardingPlayerIndex + 1) % gameState.players.length;
    
    // Only allow chow if the player is the next in turn order after the discarder
    if (nextPlayerIndex === 0) { // Player is next after the discarder
      const chowOptions = canFormChow(player.hand, discardedTile.tile);
      chowOptions.forEach(chowTiles => {
        const sequenceTiles = [discardedTile.tile, ...chowTiles].sort((a, b) => (a.value || 0) - (b.value || 0));
        options.push({
          type: 'chow',
          tiles: sequenceTiles,
          discardedTile: discardedTile.tile
        });
      });
    }

    return options;
  };

  // Handle player claim
  const handlePlayerClaim = (option: ClaimOption) => {
    if (!gameState || !pendingDiscard) return;

    const player = gameState.players[0];
    let newHand = [...player.hand];
    let newExposedSets = [...player.exposedSets];
    let newGameState = { ...gameState };

    // Remove claimed tile from discard pile
    const updatedDiscardPile = removeClaimedTileFromDiscardPile(gameState.discardPile, option.discardedTile);

    if (option.type === 'win') {
      // Handle win
      const testHand = [...player.hand, option.discardedTile];
      const winScore = calculateWinScore(testHand, player.exposedSets, 'claimed', player.isDealer);
      
      newGameState = {
        ...gameState,
        gamePhase: 'finished',
        winner: player.id,
        winType: 'claimed',
        winScore,
        discardPile: updatedDiscardPile,
        lastActionWasClaim: false, // Reset claim flag on win
        players: gameState.players.map(p => 
          p.id === player.id 
            ? { ...p, hand: testHand, score: p.score + winScore }
            : p
        )
      };
      
      soundManager.playWinSound();
    } else {
      // Handle other claims (chow, pung, kong)
      const tilesToRemove = option.tiles.slice(1); // Remove the discarded tile from the list
      newHand = player.hand.filter(tile => !tilesToRemove.some(t => t.id === tile.id));
      newExposedSets.push(option.tiles);

      newGameState = {
        ...gameState,
        currentPlayer: 0, // Player gets the turn after claiming
        discardPile: updatedDiscardPile,
        lastActionWasClaim: true, // Set claim flag - player must discard next
        players: gameState.players.map(p => 
          p.id === player.id 
            ? { ...p, hand: newHand, exposedSets: newExposedSets }
            : p
        )
      };

      soundManager.playTileSound('claim', 'center');
    }

    setGameState(newGameState);
    setClaimOptions([]);
    setShowClaimDialog(false);
    setPendingDiscard(null);
  };

  // Handle claim dialog timeout or skip
  const handleClaimSkip = () => {
    if (!gameState || !pendingDiscard) return;

    // Continue with bot claims check
    const claimResult = checkBotClaims(gameState, pendingDiscard);
    if (claimResult) {
      setGameState(claimResult);
    }

    setClaimOptions([]);
    setShowClaimDialog(false);
    setPendingDiscard(null);
  };

  // Bot AI logic
  const makeBotMove = useCallback((botPlayer: Player, gameState: GameState) => {
    const { wall, discardPile } = gameState;
    
    // Check if this turn is after a claim - if so, skip drawing and go straight to discard
    if (gameState.lastActionWasClaim) {
      // Bot must discard immediately after claiming, no drawing allowed
      const tileToDiscard = chooseBotDiscard(botPlayer.hand, botPlayer.exposedSets);
      const finalHand = botPlayer.hand.filter(tile => tile.id !== tileToDiscard.id);

      const newDiscardPile: DiscardedTile[] = [
        ...discardPile,
        {
          tile: tileToDiscard,
          playerId: botPlayer.id,
          playerName: botPlayer.name,
          turnNumber: gameState.turnNumber
        }
      ];

      return {
        ...gameState,
        discardPile: newDiscardPile,
        turnNumber: gameState.turnNumber + 1,
        lastActionWasClaim: false, // Reset claim flag after discard
        players: gameState.players.map(p => 
          p.id === botPlayer.id 
            ? { ...p, hand: finalHand }
            : p
        )
      };
    }

    // Normal turn flow - draw then discard
    if (wall.length === 0) return gameState;

    // Draw a tile first (normal turn sequence)
    const drawnTile = wall[0];
    const newWall = wall.slice(1);
    const newHand = [...botPlayer.hand, drawnTile];

    // Check if bot can win with the drawn tile
    if (isWinningHand(newHand, botPlayer.exposedSets)) {
      const winScore = calculateWinScore(newHand, botPlayer.exposedSets, 'self-drawn', botPlayer.isDealer);
      
      showBotAction('win', botPlayer.name, newHand.slice(-4));
      
      return {
        ...gameState,
        gamePhase: 'finished' as const,
        winner: botPlayer.id,
        winType: 'self-drawn' as const,
        winScore,
        wall: newWall,
        lastActionWasClaim: false, // Reset claim flag on win
        players: gameState.players.map(p => 
          p.id === botPlayer.id 
            ? { ...p, hand: newHand, score: p.score + winScore }
            : p
        )
      };
    }

    // Check if bot can form kong with drawn tile
    const kongTiles = canFormKong(botPlayer.hand, drawnTile);
    if (kongTiles && Math.random() > 0.3) {
      const newExposedSets = [...botPlayer.exposedSets, [drawnTile, ...kongTiles]];
      const remainingHand = botPlayer.hand.filter(tile => !kongTiles.includes(tile));
      
      showBotAction('kong', botPlayer.name, [drawnTile, ...kongTiles]);
      
      return {
        ...gameState,
        wall: newWall,
        lastActionWasClaim: true, // Bot must discard next turn without drawing
        players: gameState.players.map(p => 
          p.id === botPlayer.id 
            ? { ...p, hand: remainingHand, exposedSets: newExposedSets }
            : p
        )
      };
    }

    // Normal discard after drawing
    const tileToDiscard = chooseBotDiscard(newHand, botPlayer.exposedSets);
    const finalHand = newHand.filter(tile => tile.id !== tileToDiscard.id);

    const newDiscardPile: DiscardedTile[] = [
      ...discardPile,
      {
        tile: tileToDiscard,
        playerId: botPlayer.id,
        playerName: botPlayer.name,
        turnNumber: gameState.turnNumber
      }
    ];

    return {
      ...gameState,
      wall: newWall,
      discardPile: newDiscardPile,
      turnNumber: gameState.turnNumber + 1,
      lastActionWasClaim: false, // Normal turn, no claim involved
      players: gameState.players.map(p => 
        p.id === botPlayer.id 
          ? { ...p, hand: finalHand }
          : p
      )
    };
  }, []);

  // Check if any bot can claim the discarded tile
  const checkBotClaims = useCallback((gameState: GameState, discardedTile: DiscardedTile) => {
    const currentPlayerIndex = gameState.currentPlayer;
    
    // Check each bot (except the one who discarded)
    for (let i = 1; i < gameState.players.length; i++) {
      const playerIndex = (currentPlayerIndex + i) % gameState.players.length;
      const player = gameState.players[playerIndex];
      
      if (!player.isBot || player.id === discardedTile.playerId) continue;

      // Check for win first (highest priority)
      const testHand = [...player.hand, discardedTile.tile];
      if (isWinningHand(testHand, player.exposedSets)) {
        const winScore = calculateWinScore(testHand, player.exposedSets, 'claimed', player.isDealer);
        
        showBotAction('win', player.name, testHand.slice(-4));
        
        const updatedDiscardPile = removeClaimedTileFromDiscardPile(gameState.discardPile, discardedTile.tile);
        
        return {
          ...gameState,
          gamePhase: 'finished' as const,
          winner: player.id,
          winType: 'claimed' as const,
          winScore,
          currentPlayer: playerIndex,
          discardPile: updatedDiscardPile,
          lastActionWasClaim: false, // Reset claim flag on win
          players: gameState.players.map(p => 
            p.id === player.id 
              ? { ...p, hand: testHand, score: p.score + winScore }
              : p
          )
        };
      }

      // Check for kong (second priority)
      const kongTiles = canFormKong(player.hand, discardedTile.tile);
      if (kongTiles && Math.random() > 0.4) {
        const newExposedSets = [...player.exposedSets, [discardedTile.tile, ...kongTiles]];
        const newHand = player.hand.filter(tile => !kongTiles.includes(tile));
        
        showBotAction('kong', player.name, [discardedTile.tile, ...kongTiles]);
        
        const updatedDiscardPile = removeClaimedTileFromDiscardPile(gameState.discardPile, discardedTile.tile);
        
        return {
          ...gameState,
          currentPlayer: playerIndex,
          discardPile: updatedDiscardPile,
          lastActionWasClaim: true, // Bot must discard next without drawing
          players: gameState.players.map(p => 
            p.id === player.id 
              ? { ...p, hand: newHand, exposedSets: newExposedSets }
              : p
          )
        };
      }

      // Check for pung (third priority)
      const pungTiles = canFormPung(player.hand, discardedTile.tile);
      if (pungTiles && Math.random() > 0.5) {
        const newExposedSets = [...player.exposedSets, [discardedTile.tile, ...pungTiles]];
        const newHand = player.hand.filter(tile => !pungTiles.includes(tile));
        
        showBotAction('pung', player.name, [discardedTile.tile, ...pungTiles]);
        
        const updatedDiscardPile = removeClaimedTileFromDiscardPile(gameState.discardPile, discardedTile.tile);
        
        return {
          ...gameState,
          currentPlayer: playerIndex,
          discardPile: updatedDiscardPile,
          lastActionWasClaim: true, // Bot must discard next without drawing
          players: gameState.players.map(p => 
            p.id === player.id 
              ? { ...p, hand: newHand, exposedSets: newExposedSets }
              : p
          )
        };
      }

      // Check for chow (lowest priority, only from previous player)
      if (i === 1) {
        const chowOptions = canFormChow(player.hand, discardedTile.tile);
        if (chowOptions.length > 0 && Math.random() > 0.6) {
          const chowTiles = chowOptions[0];
          const newExposedSets = [...player.exposedSets, [discardedTile.tile, ...chowTiles]];
          const newHand = player.hand.filter(tile => !chowTiles.includes(tile));
          
          const sequenceTiles = [discardedTile.tile, ...chowTiles].sort((a, b) => (a.value || 0) - (b.value || 0));
          showBotAction('chow', player.name, sequenceTiles);
          
          const updatedDiscardPile = removeClaimedTileFromDiscardPile(gameState.discardPile, discardedTile.tile);
          
          return {
            ...gameState,
            currentPlayer: playerIndex,
            discardPile: updatedDiscardPile,
            lastActionWasClaim: true, // Bot must discard next without drawing
            players: gameState.players.map(p => 
              p.id === player.id 
                ? { ...p, hand: newHand, exposedSets: newExposedSets }
                : p
            )
          };
        }
      }
    }

    return null;
  }, []);

  // Bot discard selection logic
  const chooseBotDiscard = (hand: Tile[], exposedSets: Tile[][]): Tile => {
    const tileValues = new Map<string, number>();
    
    hand.forEach(tile => {
      const key = `${tile.type}-${tile.value || tile.dragon || tile.wind}`;
      tileValues.set(key, (tileValues.get(key) || 0) + 1);
    });

    let worstTile = hand[0];
    let worstScore = Infinity;

    hand.forEach(tile => {
      let score = 0;
      const key = `${tile.type}-${tile.value || tile.dragon || tile.wind}`;
      const count = tileValues.get(key) || 0;
      
      if (count >= 2) score += 10;
      if (tile.type === 'dragon' || tile.type === 'wind') score -= 5;
      
      if (tile.value && (tile.type === 'bamboo' || tile.type === 'character' || tile.type === 'dot')) {
        const hasAdjacent = hand.some(t => 
          t.type === tile.type && t.value && Math.abs(t.value - tile.value!) === 1
        );
        if (hasAdjacent) score += 8;
      }

      if (score < worstScore) {
        worstScore = score;
        worstTile = tile;
      }
    });

    return worstTile;
  };

  // Handle player tile selection
  const handleTileClick = (tileId: string) => {
    if (!gameState || gameState.gamePhase !== 'playing' || gameState.currentPlayer !== 0) {
      return;
    }

    setSelectedTile(selectedTile === tileId ? null : tileId);
  };

  // Handle player discard
  const handleDiscard = () => {
    if (!gameState || !selectedTile || gameState.currentPlayer !== 0) {
      return;
    }

    const player = gameState.players[0];
    const tileToDiscard = player.hand.find(tile => tile.id === selectedTile);
    
    if (!tileToDiscard) return;

    const newHand = player.hand.filter(tile => tile.id !== selectedTile);
    const newDiscardPile: DiscardedTile[] = [
      ...gameState.discardPile,
      {
        tile: tileToDiscard,
        playerId: player.id,
        playerName: player.name,
        turnNumber: gameState.turnNumber
      }
    ];

    let newGameState = {
      ...gameState,
      discardPile: newDiscardPile,
      turnNumber: gameState.turnNumber + 1,
      currentPlayer: 1,
      lastActionWasClaim: false, // Reset claim flag after player discard
      players: gameState.players.map(p => 
        p.id === player.id ? { ...p, hand: newHand } : p
      )
    };

    // Check if player can claim (this shouldn't happen for own discard, but keeping for completeness)
    const playerClaimOptions = checkPlayerClaims(newGameState, newDiscardPile[newDiscardPile.length - 1]);
    
    if (playerClaimOptions.length > 0) {
      setClaimOptions(playerClaimOptions);
      setShowClaimDialog(true);
      setPendingDiscard(newDiscardPile[newDiscardPile.length - 1]);
      setGameState(newGameState);
    } else {
      // Check if any bot wants to claim the discarded tile
      const claimResult = checkBotClaims(newGameState, newDiscardPile[newDiscardPile.length - 1]);
      if (claimResult) {
        newGameState = claimResult;
      }
      setGameState(newGameState);
    }

    setSelectedTile(null);
    setIsFirstMove(false);
    soundManager.playTileSound('discard', 'bottom');
  };

  // Handle draw tile - now automatic for normal turns
  const handleDrawTile = () => {
    if (!gameState || gameState.currentPlayer !== 0 || gameState.wall.length === 0) {
      return;
    }

    // Check if player just made a claim - if so, they cannot draw
    if (gameState.lastActionWasClaim) {
      soundManager.playErrorSound();
      return;
    }

    if (isFirstMove) {
      soundManager.playErrorSound();
      return;
    }

    const drawnTile = gameState.wall[0];
    const newWall = gameState.wall.slice(1);
    const player = gameState.players[0];
    const newHand = sortTiles([...player.hand, drawnTile]);

    if (isWinningHand(newHand, player.exposedSets)) {
      const winScore = calculateWinScore(newHand, player.exposedSets, 'self-drawn', player.isDealer);
      
      setGameState({
        ...gameState,
        gamePhase: 'finished',
        winner: player.id,
        winType: 'self-drawn',
        winScore,
        wall: newWall,
        lastActionWasClaim: false, // Reset claim flag on win
        players: gameState.players.map(p => 
          p.id === player.id 
            ? { ...p, hand: newHand, score: p.score + winScore }
            : p
        )
      });
      
      soundManager.playWinSound();
      return;
    }

    setGameState({
      ...gameState,
      wall: newWall,
      players: gameState.players.map(p => 
        p.id === player.id ? { ...p, hand: newHand } : p
      )
    });

    soundManager.playTileSound('draw', 'center');
  };

  // Auto-draw for player on their turn (except first move and after claims)
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing' || gameState.currentPlayer !== 0) return;
    if (isFirstMove || gameState.lastActionWasClaim || gameState.wall.length === 0) return;

    // Auto-draw after a short delay to show turn transition
    const timer = setTimeout(() => {
      handleDrawTile();
    }, 800);

    return () => clearTimeout(timer);
  }, [gameState?.currentPlayer, gameState?.lastActionWasClaim, isFirstMove]);

  // Bot turn processing
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    if (currentPlayer.isBot) {
      const timer = setTimeout(() => {
        const drawReason = checkDrawCondition(gameState.wall.length, gameState.turnNumber);
        if (drawReason) {
          const finalScores = calculateDrawScores(gameState.players);
          setGameState({
            ...gameState,
            gamePhase: 'draw',
            drawReason,
            finalScores
          });
          return;
        }

        const newGameState = makeBotMove(currentPlayer, gameState);
        
        if (newGameState.gamePhase === 'playing') {
          const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
          const updatedGameState = {
            ...newGameState,
            currentPlayer: nextPlayer
          };

          // Check if player can claim the bot's discard
          const lastDiscard = newGameState.discardPile[newGameState.discardPile.length - 1];
          if (lastDiscard && lastDiscard.playerId !== 'player1') {
            const playerClaimOptions = checkPlayerClaims(updatedGameState, lastDiscard);
            
            if (playerClaimOptions.length > 0) {
              setClaimOptions(playerClaimOptions);
              setShowClaimDialog(true);
              setPendingDiscard(lastDiscard);
              setGameState(updatedGameState);
              return;
            }
          }

          // If no player claims, check bot claims
          if (lastDiscard) {
            const claimResult = checkBotClaims(updatedGameState, lastDiscard);
            if (claimResult) {
              setGameState(claimResult);
              return;
            }
          }

          setGameState(updatedGameState);
        } else {
          setGameState(newGameState);
          if (newGameState.gamePhase === 'finished') {
            soundManager.playWinSound();
          }
        }

        const position = currentPlayer.id === 'bot1' ? 'right' : 
                        currentPlayer.id === 'bot2' ? 'top' : 'left';
        soundManager.playTileSound('discard', position);
        soundManager.playTransitionSound('turn-change');
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [gameState, makeBotMove, soundManager, checkBotClaims]);

  // Auto-close claim dialog after timeout
  useEffect(() => {
    if (showClaimDialog) {
      const timer = setTimeout(() => {
        handleClaimSkip();
      }, 8000); // 8 seconds to decide

      return () => clearTimeout(timer);
    }
  }, [showClaimDialog]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const playerHand = gameState.players[0];
  const canDraw = gameState.currentPlayer === 0 && gameState.wall.length > 0 && !isFirstMove && !gameState.lastActionWasClaim;
  const canDiscard = gameState.currentPlayer === 0 && selectedTile !== null;
  const isGameFinished = gameState.gamePhase === 'finished' || gameState.gamePhase === 'draw';
  const isPlayerTurn = gameState.currentPlayer === 0;
  const needsToDrawFirst = isPlayerTurn && !isFirstMove && !gameState.lastActionWasClaim && playerHand.hand.length === 13;

  return (
    <div className="min-h-screen p-4">
      {/* Bot Action Indicator */}
      {botAction && (
        <BotActionIndicator
          action={botAction.type}
          playerName={botAction.playerName}
          tiles={botAction.tiles}
          onComplete={() => setBotAction(null)}
        />
      )}

      {/* Claim Dialog */}
      {showClaimDialog && claimOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-xl">Claim Tile?</h3>
              <button
                onClick={handleClaimSkip}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-emerald-200 mb-4">
              You can claim the discarded tile:
            </p>
            
            {pendingDiscard && (
              <div className="flex justify-center mb-4">
                <TileComponent tile={pendingDiscard.tile} className="border-2 border-amber-400" />
              </div>
            )}
            
            <div className="space-y-3">
              {claimOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handlePlayerClaim(option)}
                  className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{option.type}</span>
                    <div className="flex gap-1">
                      {option.tiles.slice(0, 4).map((tile, tileIndex) => (
                        <TileComponent
                          key={tileIndex}
                          tile={tile}
                          height="compact"
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
              
              <button
                onClick={handleClaimSkip}
                className="w-full p-3 bg-gray-600/50 hover:bg-gray-600/70 border border-gray-500/50 rounded-lg text-white transition-all duration-200"
              >
                Skip / Pass
              </button>
            </div>
            
            <div className="mt-4 text-center text-xs text-emerald-300">
              Auto-skip in 8 seconds
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Game Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">Round {gameState.round}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">Turn {gameState.turnNumber}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">Wall: {gameState.wall.length}</span>
            </div>
            {isFirstMove && gameState.currentPlayer === 0 && (
              <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-lg px-4 py-2 flex items-center space-x-2">
                <span className="text-amber-200 font-medium text-sm">First move: Must discard</span>
              </div>
            )}
            {gameState.lastActionWasClaim && gameState.currentPlayer === 0 && (
              <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-lg px-4 py-2 flex items-center space-x-2">
                <span className="text-blue-200 font-medium text-sm">After claim: Must discard</span>
              </div>
            )}
            {needsToDrawFirst && (
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-lg px-4 py-2 flex items-center space-x-2">
                <span className="text-green-200 font-medium text-sm">Drawing tile...</span>
              </div>
            )}
            {isGameFinished && (
              <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-lg px-4 py-2 flex items-center space-x-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="text-amber-200 font-medium">All tiles revealed</span>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={initializeGame}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Game Status */}
        {gameState.gamePhase === 'playing' && (
          <div className="text-center mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 inline-block">
              <div className="flex items-center justify-center space-x-3">
                <Users className="w-5 h-5 text-emerald-300" />
                <span className="text-white font-medium text-lg">
                  {currentPlayer.isBot ? `${currentPlayer.name} is thinking...` : 
                   isFirstMove ? "Your turn - Must discard a tile first" : 
                   gameState.lastActionWasClaim ? "Your turn - Must discard after claim" : 
                   needsToDrawFirst ? "Drawing tile automatically..." : "Your turn - Select tile to discard"}
                </span>
                {(currentPlayer.isBot || needsToDrawFirst) && <Clock className="w-4 h-4 text-emerald-300 animate-spin" />}
              </div>
            </div>
          </div>
        )}

        {/* Win/Draw Status */}
        {gameState.gamePhase === 'finished' && (
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 backdrop-blur-sm border border-amber-400/30 rounded-xl p-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Trophy className="w-8 h-8 text-amber-400" />
                <h2 className="text-3xl font-bold text-white">Game Over!</h2>
              </div>
              <p className="text-xl text-emerald-100 mb-2">
                {gameState.winner === 'player1' ? 'Congratulations! You won!' : 
                 `${gameState.players.find(p => p.id === gameState.winner)?.name} wins!`}
              </p>
              <p className="text-emerald-200">
                Win Type: {gameState.winType === 'self-drawn' ? 'Self-drawn' : 'Claimed'} • 
                Score: {gameState.winScore} points
              </p>
            </div>
          </div>
        )}

        {gameState.gamePhase === 'draw' && (
          <div className="text-center mb-6">
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2">Draw Game</h2>
              <p className="text-emerald-100">
                {gameState.drawReason === 'wall-exhausted' ? 'Wall exhausted' : 'Too many turns'}
              </p>
            </div>
          </div>
        )}

        {/* Bot Hands Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {gameState.players.slice(1).map((bot) => (
            <div key={bot.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <h3 className="text-white font-medium mb-3 text-center">{bot.name}</h3>
              <div className="text-center text-emerald-200 mb-2">
                {bot.hand.length} tiles in hand
                {gameState.winner === bot.id && (
                  <span className="ml-2 text-amber-400 font-bold">👑 WINNER</span>
                )}
              </div>
              
              <div className="flex flex-wrap justify-center gap-1 mb-4">
                {isGameFinished ? (
                  bot.hand.map((tile, index) => (
                    <TileComponent
                      key={`${tile.id}-${index}`}
                      tile={tile}
                      height="compact"
                      className={gameState.winner === bot.id ? "border-2 border-amber-400 shadow-lg" : ""}
                    />
                  ))
                ) : (
                  <>
                    {bot.hand.slice(0, Math.min(bot.hand.length, 8)).map((_, index) => (
                      <div
                        key={index}
                        className="w-8 h-12 bg-gradient-to-b from-emerald-600 to-emerald-700 rounded border border-emerald-500 flex items-center justify-center"
                      >
                      </div>
                    ))}
                    {bot.hand.length > 8 && (
                      <div className="w-8 h-12 bg-emerald-600/50 rounded border border-emerald-500 flex items-center justify-center">
                        <span className="text-emerald-200 text-xs">+{bot.hand.length - 8}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {bot.exposedSets.length > 0 && (
                <div>
                  <h4 className="text-emerald-200 font-medium mb-2 text-center text-sm">Exposed Sets</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {bot.exposedSets.map((set, index) => (
                      <div key={index} className="flex gap-0.5 bg-white/5 rounded p-1">
                        {set.map((tile, tileIndex) => (
                          <TileComponent
                            key={`${tile.id}-${tileIndex}`}
                            tile={tile}
                            height="compact"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Discard History */}
        <div className="mb-8">
          <DiscardHistory 
            discardPile={gameState.discardPile} 
            players={gameState.players}
          />
        </div>

        {/* Player Hand */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <h3 className="text-white font-medium text-lg">Your Hand ({playerHand.hand.length} tiles)</h3>
            {gameState.winner === 'player1' && (
              <span className="text-amber-400 font-bold text-lg">👑 WINNER!</span>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {playerHand.hand.map((tile) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={selectedTile === tile.id}
                onClick={() => handleTileClick(tile.id)}
                className={`transition-all duration-200 ${
                  gameState.winner === 'player1' ? "border-2 border-amber-400 shadow-lg" : ""
                }`}
              />
            ))}
          </div>

          {/* Player Actions */}
          {gameState.gamePhase === 'playing' && gameState.currentPlayer === 0 && !needsToDrawFirst && (
            <div className="flex justify-center space-x-4 mb-6">
              <button
                onClick={handleDiscard}
                disabled={!canDiscard}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  canDiscard
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isFirstMove ? "Discard Selected (Required)" : 
                 gameState.lastActionWasClaim ? "Discard Selected (Required After Claim)" :
                 "Discard Selected"}
              </button>
            </div>
          )}
          
          {/* First Move Instructions */}
          {isFirstMove && gameState.currentPlayer === 0 && gameState.gamePhase === 'playing' && (
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4 mb-4">
              <div className="text-center">
                <p className="text-amber-200 font-medium mb-2">🎯 First Move Rules</p>
                <p className="text-emerald-200 text-sm">
                  As the dealer, you start with 14 tiles. You must discard one tile to begin the game.
                  After this, you'll automatically draw a tile at the start of each turn.
                </p>
              </div>
            </div>
          )}

          {/* After Claim Instructions */}
          {gameState.lastActionWasClaim && gameState.currentPlayer === 0 && gameState.gamePhase === 'playing' && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-4">
              <div className="text-center">
                <p className="text-blue-200 font-medium mb-2">🎯 After Claim Rules</p>
                <p className="text-emerald-200 text-sm">
                  You just made a claim (chow, pung, or kong). According to classical Mahjong rules, 
                  you must discard a tile immediately without drawing from the wall.
                </p>
              </div>
            </div>
          )}

          {/* Normal Turn Instructions */}
          {!isFirstMove && !gameState.lastActionWasClaim && gameState.currentPlayer === 0 && gameState.gamePhase === 'playing' && !needsToDrawFirst && (
            <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4 mb-4">
              <div className="text-center">
                <p className="text-green-200 font-medium mb-2">🎯 Normal Turn</p>
                <p className="text-emerald-200 text-sm">
                  You automatically drew a tile at the start of your turn. Now select a tile to discard.
                </p>
              </div>
            </div>
          )}
          
          {/* Exposed Sets */}
          {playerHand.exposedSets.length > 0 && (
            <div>
              <h4 className="text-emerald-200 font-medium mb-3 text-center">Your Exposed Sets</h4>
              <div className="flex flex-wrap justify-center gap-4">
                {playerHand.exposedSets.map((set, index) => (
                  <div key={index} className="flex gap-1 bg-white/5 rounded-lg p-2">
                    {set.map((tile, tileIndex) => (
                      <TileComponent
                        key={`${tile.id}-${tileIndex}`}
                        tile={tile}
                        height="compact"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
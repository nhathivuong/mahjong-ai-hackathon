import React, { useState, useEffect, useCallback } from 'react';
import { Player, GameState, Tile, DiscardedTile } from '../types/mahjong';
import { createTileSet, shuffleTiles, isWinningHand, sortTiles, canFormChow, canFormPung, canFormKong } from '../utils/tileUtils';
import { SoundManager } from '../utils/soundUtils';
import TileComponent from './TileComponent';
import DiscardHistory from './DiscardHistory';
import { Users, Bot, Trophy, RotateCcw, Volume2, VolumeX, Settings, AlertCircle } from 'lucide-react';

interface GameBoardProps {
  gameMode: 'bot' | 'local' | 'online';
}

interface ClaimOption {
  type: 'chow' | 'pung' | 'kong';
  tiles: Tile[];
  label: string;
  discardedTile: Tile;
}

interface TurnActions {
  hasDrawn: boolean;
  hasDiscarded: boolean;
  canDraw: boolean;
  canDiscard: boolean;
}

interface PlayerActionLog {
  playerId: string;
  action: string;
  timestamp: number;
  tileId?: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameMode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [drawnTile, setDrawnTile] = useState<Tile | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [claimOptions, setClaimOptions] = useState<ClaimOption[]>([]);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [isFirstTurn, setIsFirstTurn] = useState(true);
  
  // Turn action tracking
  const [turnActions, setTurnActions] = useState<TurnActions>({
    hasDrawn: false,
    hasDiscarded: false,
    canDraw: false, // Dealer cannot draw on first turn
    canDiscard: true // Dealer must discard first
  });
  
  // Action tracking for anti-cheat
  const [lastActionTime, setLastActionTime] = useState(0);
  const [actionLog, setActionLog] = useState<PlayerActionLog[]>([]);
  
  const soundManager = SoundManager.getInstance();

  useEffect(() => {
    initializeGame();
  }, []);

  const logAction = (playerId: string, action: string, tileId?: string) => {
    const logEntry: PlayerActionLog = {
      playerId,
      action,
      timestamp: Date.now(),
      tileId
    };
    
    setActionLog(prev => [...prev.slice(-50), logEntry]); // Keep last 50 actions
    
    // Check for suspicious behavior (rapid actions)
    const recentActions = actionLog.filter(log => 
      log.playerId === playerId && 
      Date.now() - log.timestamp < 2000 // Last 2 seconds
    );
    
    if (recentActions.length > 5) {
      console.warn(`Suspicious rapid actions detected for player ${playerId}`);
      showErrorMessage('Too many rapid actions detected. Please slow down.');
    }
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
    soundManager.playErrorSound();
    
    setTimeout(() => {
      setShowError(false);
      setErrorMessage('');
    }, 3000);
  };

  const validateAction = (action: 'draw' | 'discard'): boolean => {
    const now = Date.now();
    
    // Check cooldown (300ms between actions)
    if (now - lastActionTime < 300) {
      showErrorMessage('Please wait a moment between actions.');
      return false;
    }
    
    // Special validation for dealer's first turn
    if (isFirstTurn && action === 'draw') {
      showErrorMessage('As the dealer, you must discard first since you start with 14 tiles.');
      return false;
    }
    
    // Check turn-specific validations
    if (action === 'draw' && !turnActions.canDraw) {
      if (turnActions.hasDrawn) {
        showErrorMessage('You have already drawn a tile this turn.');
      } else {
        showErrorMessage('You cannot draw a tile right now.');
      }
      return false;
    }
    
    if (action === 'discard' && !turnActions.canDiscard) {
      if (turnActions.hasDiscarded) {
        showErrorMessage('You have already discarded a tile this turn.');
      } else if (!turnActions.hasDrawn && !drawnTile && !isFirstTurn) {
        showErrorMessage('You must draw a tile or have tiles in hand before discarding.');
      } else {
        showErrorMessage('You cannot discard a tile right now.');
      }
      return false;
    }
    
    return true;
  };

  const resetTurnActions = () => {
    setTurnActions({
      hasDrawn: false,
      hasDiscarded: false,
      canDraw: true,
      canDiscard: false
    });
  };

  const updateTurnActions = (action: 'draw' | 'discard' | 'claim') => {
    setTurnActions(prev => {
      const newState = { ...prev };
      
      if (action === 'draw') {
        newState.hasDrawn = true;
        newState.canDraw = false;
        newState.canDiscard = true; // Can now discard after drawing
      } else if (action === 'discard') {
        newState.hasDiscarded = true;
        newState.canDiscard = false;
        // Turn ends after discard, so both actions become unavailable
        newState.canDraw = false;
        
        // Clear first turn flag after any action
        if (isFirstTurn) {
          setIsFirstTurn(false);
        }
      } else if (action === 'claim') {
        // After claiming, player can discard but not draw
        newState.hasDrawn = true; // Claiming counts as drawing
        newState.canDraw = false;
        newState.canDiscard = true;
      }
      
      return newState;
    });
  };

  const playSound = (type: 'draw' | 'discard' | 'claim' | 'win' | 'error', position?: 'center' | 'left' | 'right' | 'top' | 'bottom') => {
    if (type === 'win') {
      soundManager.playWinSound();
    } else if (type === 'error') {
      soundManager.playErrorSound();
    } else {
      soundManager.playTileSound(type, position);
    }
  };

  const getPlayerPosition = (playerIndex: number): 'center' | 'left' | 'right' | 'top' | 'bottom' => {
    switch (playerIndex) {
      case 0: return 'bottom';
      case 1: return 'right';
      case 2: return 'top';
      case 3: return 'left';
      default: return 'center';
    }
  };

  const initializeGame = () => {
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
        name: 'Bot East',
        hand: tiles.slice(13, 26),
        exposedSets: [],
        score: 0,
        isDealer: false,
        isBot: true
      },
      {
        id: 'bot2',
        name: 'Bot South',
        hand: tiles.slice(26, 39),
        exposedSets: [],
        score: 0,
        isDealer: false,
        isBot: true
      },
      {
        id: 'bot3',
        name: 'Bot West',
        hand: tiles.slice(39, 52),
        exposedSets: [],
        score: 0,
        isDealer: false,
        isBot: true
      }
    ];

    // Dealer gets an extra tile
    players[0].hand.push(tiles[52]);
    players[0].hand = sortTiles(players[0].hand);

    setGameState({
      players,
      currentPlayer: 0,
      wall: tiles.slice(53),
      discardPile: [],
      round: 1,
      gamePhase: 'playing',
      turnNumber: 1
    });

    setSelectedTileIndex(null);
    setDrawnTile(null);
    setIsProcessingTurn(false);
    setClaimOptions([]);
    setShowClaimDialog(false);
    setIsFirstTurn(true);
    
    // Initialize turn actions for dealer (must discard first)
    setTurnActions({
      hasDrawn: false,
      hasDiscarded: false,
      canDraw: false, // Dealer cannot draw on first turn
      canDiscard: true // Dealer must discard first
    });
    
    setActionLog([]);
    
    soundManager.playTransitionSound('game-start');
  };

  // Helper function to remove duplicate chow sequences
  const removeDuplicateChows = (options: ClaimOption[]): ClaimOption[] => {
    const uniqueOptions: ClaimOption[] = [];
    const seenSequences = new Set<string>();

    options.forEach(option => {
      if (option.type === 'chow') {
        // Create a signature for the sequence based on sorted tile values
        const allTiles = [...option.tiles, option.discardedTile];
        const values = allTiles.map(tile => tile.value!).sort((a, b) => a - b);
        const signature = `${option.discardedTile.type}-${values.join('-')}`;
        
        if (!seenSequences.has(signature)) {
          seenSequences.add(signature);
          uniqueOptions.push(option);
        }
      } else {
        // For pung and kong, just add them as they don't have duplicates
        uniqueOptions.push(option);
      }
    });

    return uniqueOptions;
  };

  const checkClaimOptions = useCallback((discardedTile: Tile, playerHand: Tile[]): ClaimOption[] => {
    const options: ClaimOption[] = [];

    // Check for Kong
    const kongTiles = canFormKong(playerHand, discardedTile);
    if (kongTiles) {
      options.push({
        type: 'kong',
        tiles: kongTiles,
        label: 'Kong (4 of a kind)',
        discardedTile
      });
    }

    // Check for Pung
    const pungTiles = canFormPung(playerHand, discardedTile);
    if (pungTiles) {
      options.push({
        type: 'pung',
        tiles: pungTiles,
        label: 'Pung (3 of a kind)',
        discardedTile
      });
    }

    // Check for Chow (only from previous player)
    const chowOptions = canFormChow(playerHand, discardedTile);
    chowOptions.forEach((chowTiles) => {
      options.push({
        type: 'chow',
        tiles: chowTiles,
        label: 'Chow (sequence)',
        discardedTile
      });
    });

    // Remove duplicate chow sequences
    return removeDuplicateChows(options);
  }, []);

  const drawTile = useCallback((playerIndex: number) => {
    if (!gameState || gameState.wall.length === 0 || gameState.gamePhase === 'finished' || isProcessingTurn) return;

    // Validate action for human player
    if (playerIndex === 0) {
      if (gameState.currentPlayer !== 0) {
        showErrorMessage("It's not your turn to draw.");
        return;
      }
      
      if (!validateAction('draw')) return;
    }

    const newWall = [...gameState.wall];
    const drawnTileFromWall = newWall.pop()!;
    
    const newPlayers = [...gameState.players];
    
    if (playerIndex === 0) {
      // For human player, set the drawn tile separately
      setDrawnTile(drawnTileFromWall);
      updateTurnActions('draw');
      setLastActionTime(Date.now());
      logAction('player1', 'draw', drawnTileFromWall.id);
      playSound('draw', 'bottom');
    } else {
      // For bots, add directly to hand
      newPlayers[playerIndex].hand.push(drawnTileFromWall);
      logAction(newPlayers[playerIndex].id, 'draw', drawnTileFromWall.id);
      playSound('draw', getPlayerPosition(playerIndex));
    }

    setGameState(prev => prev ? {
      ...prev,
      players: newPlayers,
      wall: newWall
    } : null);

    // Check for winning condition for bots
    if (playerIndex !== 0 && isWinningHand([...newPlayers[playerIndex].hand])) {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: newPlayers[playerIndex].id
      } : null);
      playSound('win');
      setIsProcessingTurn(false);
    }
  }, [gameState, isProcessingTurn, validateAction, logAction, playSound]);

  const discardTile = useCallback((playerIndex: number, tileIndex: number, isFromDrawn = false) => {
    if (!gameState || gameState.gamePhase === 'finished' || isProcessingTurn) return;

    // Validate action for human player
    if (playerIndex === 0) {
      if (gameState.currentPlayer !== 0) {
        showErrorMessage("It's not your turn to discard.");
        return;
      }
      
      if (!validateAction('discard')) return;
    }

    setIsProcessingTurn(true);

    const newPlayers = [...gameState.players];
    let discardedTile: Tile;

    if (playerIndex === 0 && isFromDrawn && drawnTile) {
      // Discarding the drawn tile
      discardedTile = drawnTile;
      setDrawnTile(null);
      updateTurnActions('discard');
      setLastActionTime(Date.now());
    } else {
      // Discarding from hand
      discardedTile = newPlayers[playerIndex].hand.splice(tileIndex, 1)[0];
      
      if (playerIndex === 0) {
        updateTurnActions('discard');
        setLastActionTime(Date.now());
        // Sort player's hand after discarding
        newPlayers[playerIndex].hand = sortTiles(newPlayers[playerIndex].hand);
      }
    }
    
    logAction(newPlayers[playerIndex].id, 'discard', discardedTile.id);
    playSound('discard', getPlayerPosition(playerIndex));
    
    const discardedTileWithInfo: DiscardedTile = {
      tile: discardedTile,
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      turnNumber: gameState.turnNumber
    };

    const newDiscardPile = [...gameState.discardPile, discardedTileWithInfo];
    const nextPlayer = (gameState.currentPlayer + 1) % 4;

    const newGameState = {
      ...gameState,
      players: newPlayers,
      discardPile: newDiscardPile,
      currentPlayer: nextPlayer,
      turnNumber: gameState.turnNumber + 1
    };

    setGameState(newGameState);
    setSelectedTileIndex(null);

    // Reset turn actions for the next player
    if (nextPlayer === 0) {
      resetTurnActions();
    }

    // Play turn change sound
    soundManager.playTransitionSound('turn-change');

    // Check if human player can claim the discarded tile (only if it's not their own discard)
    if (playerIndex !== 0) {
      const humanPlayerHand = newPlayers[0].hand;
      const claimOpts = checkClaimOptions(discardedTile, humanPlayerHand);
      
      if (claimOpts.length > 0) {
        setClaimOptions(claimOpts);
        setShowClaimDialog(true);
        setIsProcessingTurn(false);
        return;
      }
    }

    // Continue to next turn after a delay
    setTimeout(() => {
      continueToNextTurn(newGameState);
    }, 800);
  }, [gameState, drawnTile, isProcessingTurn, checkClaimOptions, validateAction, logAction, playSound]);

  const continueToNextTurn = useCallback((currentGameState: GameState) => {
    setIsProcessingTurn(false);
    
    if (currentGameState.gamePhase === 'playing' && currentGameState.currentPlayer !== 0) {
      // Start bot turn
      setTimeout(() => {
        botTurn(currentGameState.currentPlayer, currentGameState);
      }, 500);
    }
  }, []);

  const handleClaim = useCallback((option: ClaimOption) => {
    if (!gameState || !showClaimDialog) return;

    const newPlayers = [...gameState.players];
    const humanPlayer = newPlayers[0];
    const lastDiscard = gameState.discardPile[gameState.discardPile.length - 1];
    
    // Remove tiles from hand
    option.tiles.forEach(tile => {
      const index = humanPlayer.hand.findIndex(t => t.id === tile.id);
      if (index !== -1) {
        humanPlayer.hand.splice(index, 1);
      }
    });

    // Add the claimed set to exposed sets
    const claimedSet = [...option.tiles, lastDiscard.tile];
    humanPlayer.exposedSets.push(claimedSet);
    
    // Sort remaining hand
    humanPlayer.hand = sortTiles(humanPlayer.hand);

    // Remove the last discard from discard pile since it was claimed
    const newDiscardPile = gameState.discardPile.slice(0, -1);

    setGameState({
      ...gameState,
      players: newPlayers,
      discardPile: newDiscardPile,
      currentPlayer: 0 // Human player's turn after claiming
    });

    setShowClaimDialog(false);
    setClaimOptions([]);
    
    // Update turn actions after claiming
    updateTurnActions('claim');
    
    logAction('player1', `claim-${option.type}`, lastDiscard.tile.id);
    playSound('claim', 'center');

    // Check for winning condition
    const totalTiles = humanPlayer.hand.length + (humanPlayer.exposedSets.length * 3);
    if (totalTiles === 13 && isWinningHand([...humanPlayer.hand, ...humanPlayer.exposedSets.flat()])) {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: humanPlayer.id
      } : null);
      playSound('win');
    }
  }, [gameState, showClaimDialog, logAction, playSound]);

  const handleSkipClaim = useCallback(() => {
    setShowClaimDialog(false);
    setClaimOptions([]);
    
    if (gameState) {
      continueToNextTurn(gameState);
    }
  }, [gameState, continueToNextTurn]);

  const botTurn = useCallback((botIndex: number, currentGameState: GameState) => {
    if (currentGameState.gamePhase === 'finished' || isProcessingTurn) return;

    setIsProcessingTurn(true);

    // Bot draws a tile
    setTimeout(() => {
      if (currentGameState.wall.length > 0) {
        const newWall = [...currentGameState.wall];
        const drawnTileFromWall = newWall.pop()!;
        
        const newPlayers = [...currentGameState.players];
        newPlayers[botIndex].hand.push(drawnTileFromWall);

        const updatedGameState = {
          ...currentGameState,
          players: newPlayers,
          wall: newWall
        };

        setGameState(updatedGameState);
        logAction(newPlayers[botIndex].id, 'draw', drawnTileFromWall.id);
        playSound('draw', getPlayerPosition(botIndex));

        // Check for winning condition
        if (isWinningHand(newPlayers[botIndex].hand)) {
          setGameState(prev => prev ? {
            ...prev,
            gamePhase: 'finished',
            winner: newPlayers[botIndex].id
          } : null);
          playSound('win');
          setIsProcessingTurn(false);
          return;
        }

        // Bot discards a random tile after a delay
        setTimeout(() => {
          if (updatedGameState.gamePhase === 'playing' && newPlayers[botIndex].hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * newPlayers[botIndex].hand.length);
            const discardedTile = newPlayers[botIndex].hand.splice(randomIndex, 1)[0];
            
            logAction(newPlayers[botIndex].id, 'discard', discardedTile.id);
            playSound('discard', getPlayerPosition(botIndex));
            
            const discardedTileWithInfo: DiscardedTile = {
              tile: discardedTile,
              playerId: updatedGameState.players[botIndex].id,
              playerName: updatedGameState.players[botIndex].name,
              turnNumber: updatedGameState.turnNumber
            };

            const newDiscardPile = [...updatedGameState.discardPile, discardedTileWithInfo];
            const nextPlayer = (updatedGameState.currentPlayer + 1) % 4;

            const finalGameState = {
              ...updatedGameState,
              players: newPlayers,
              discardPile: newDiscardPile,
              currentPlayer: nextPlayer,
              turnNumber: updatedGameState.turnNumber + 1
            };

            setGameState(finalGameState);
            
            // Play turn change sound
            soundManager.playTransitionSound('turn-change');
            
            // Check if human player can claim this discard
            if (nextPlayer === 0) {
              resetTurnActions(); // Reset for human player's turn
              
              const humanPlayerHand = newPlayers[0].hand;
              const claimOpts = checkClaimOptions(discardedTile, humanPlayerHand);
              
              if (claimOpts.length > 0) {
                setClaimOptions(claimOpts);
                setShowClaimDialog(true);
                setIsProcessingTurn(false);
                return;
              }
            }
            
            setTimeout(() => {
              setIsProcessingTurn(false);
              
              // Continue to next player if it's another bot
              if (finalGameState.gamePhase === 'playing' && nextPlayer !== 0) {
                setTimeout(() => {
                  botTurn(nextPlayer, finalGameState);
                }, 500);
              }
            }, 800);
          } else {
            setIsProcessingTurn(false);
          }
        }, 1000);
      } else {
        setIsProcessingTurn(false);
      }
    }, 500);
  }, [isProcessingTurn, checkClaimOptions, logAction, playSound]);

  const handlePlayerTileClick = (tileIndex: number) => {
    if (gameState?.gamePhase === 'finished' || isProcessingTurn || gameState?.currentPlayer !== 0) {
      return;
    }
    
    // Can only select tiles if we can discard
    if (!turnActions.canDiscard) {
      if (isFirstTurn) {
        // Special message for dealer's first turn
        showErrorMessage("As the dealer, you must discard a tile to begin the game.");
      } else if (!turnActions.hasDrawn && !drawnTile) {
        showErrorMessage("Draw a tile first or wait for your turn to begin.");
      } else {
        showErrorMessage("You cannot discard right now.");
      }
      return;
    }
    
    setSelectedTileIndex(selectedTileIndex === tileIndex ? null : tileIndex);
  };

  const handleDrawnTileClick = () => {
    if (gameState?.gamePhase === 'finished' || !drawnTile || isProcessingTurn || gameState?.currentPlayer !== 0) return;
    setSelectedTileIndex(null);
  };

  const handlePlayerDiscard = () => {
    if (gameState?.currentPlayer !== 0 || gameState?.gamePhase !== 'playing' || isProcessingTurn) {
      return;
    }
    
    if (!turnActions.canDiscard) {
      showErrorMessage("You cannot discard right now.");
      return;
    }
    
    if (selectedTileIndex !== null) {
      discardTile(0, selectedTileIndex);
    }
  };

  const handleDiscardDrawnTile = () => {
    if (gameState?.currentPlayer !== 0 || gameState?.gamePhase !== 'playing' || !drawnTile || isProcessingTurn) return;
    
    if (!turnActions.canDiscard) {
      showErrorMessage("You cannot discard right now.");
      return;
    }
    
    discardTile(0, -1, true);
  };

  const handleDrawTile = () => {
    if (gameState?.currentPlayer !== 0 || gameState?.gamePhase !== 'playing' || isProcessingTurn) {
      if (gameState?.currentPlayer !== 0) {
        showErrorMessage("It's not your turn to draw.");
      }
      return;
    }
    
    if (!turnActions.canDraw) {
      if (isFirstTurn) {
        showErrorMessage("As the dealer, you must discard first since you start with 14 tiles.");
      } else if (turnActions.hasDrawn) {
        showErrorMessage("You have already drawn a tile this turn.");
      } else {
        showErrorMessage("You cannot draw a tile right now.");
      }
      return;
    }
    
    drawTile(0);
  };

  const handleKeepDrawnTile = () => {
    if (!drawnTile || gameState?.gamePhase === 'finished' || isProcessingTurn || gameState?.currentPlayer !== 0) return;

    // Add drawn tile to hand and sort
    const newPlayers = [...gameState!.players];
    newPlayers[0].hand.push(drawnTile);
    newPlayers[0].hand = sortTiles(newPlayers[0].hand);

    setGameState({
      ...gameState!,
      players: newPlayers
    });

    setDrawnTile(null);
    logAction('player1', 'keep-drawn', drawnTile.id);

    // Check for winning condition
    if (isWinningHand(newPlayers[0].hand)) {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: newPlayers[0].id
      } : null);
      playSound('win');
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const playerHand = gameState.players[0].hand;
  const isPlayerTurn = gameState.currentPlayer === 0;

  // Filter out claimed tiles from discard pile for display
  const getActiveDiscards = () => {
    const claimedTileIds = new Set();
    
    // Collect all claimed tile IDs from all players' exposed sets
    gameState.players.forEach(player => {
      player.exposedSets.forEach(set => {
        set.forEach(tile => {
          claimedTileIds.add(tile.id);
        });
      });
    });
    
    // Return only discards that haven't been claimed
    return gameState.discardPile.filter(discard => !claimedTileIds.has(discard.tile.id));
  };

  const activeDiscards = getActiveDiscards();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Error Message */}
        {showError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Audio Settings Modal */}
        {showAudioSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Audio Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Master Volume
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={soundManager.getMasterVolume()}
                    onChange={(e) => soundManager.setMasterVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">
                    {Math.round(soundManager.getMasterVolume() * 100)}%
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sound Effects Volume
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={soundManager.getSfxVolume()}
                    onChange={(e) => soundManager.setSfxVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">
                    {Math.round(soundManager.getSfxVolume() * 100)}%
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableSound"
                    checked={soundManager.getEnabled()}
                    onChange={(e) => soundManager.setEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="enableSound" className="text-sm font-medium text-gray-700">
                    Enable Sound Effects
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAudioSettings(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">Round {gameState.round}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">
                Turn {gameState.turnNumber}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">
                Current: {currentPlayer.name}
                {isProcessingTurn && <span className="ml-2 text-amber-300">⏳</span>}
              </span>
            </div>
            {isPlayerTurn && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-blue-400">
                <span className="text-blue-200 font-medium">
                  {isFirstTurn ? 'Dealer - Must Discard First' : 
                   `Draw: ${turnActions.hasDrawn ? '✓' : turnActions.canDraw ? '○' : '✗'} | 
                    Discard: ${turnActions.hasDiscarded ? '✓' : turnActions.canDiscard ? '○' : '✗'}`}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAudioSettings(true)}
              className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
              title="Audio Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => soundManager.setEnabled(!soundManager.getEnabled())}
              className={`p-2 rounded-lg transition-colors ${
                soundManager.getEnabled() 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
              title={soundManager.getEnabled() ? 'Sound On' : 'Sound Off'}
            >
              {soundManager.getEnabled() ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium">
                Wall: {gameState.wall.length} tiles
              </span>
            </div>
            <button
              onClick={initializeGame}
              disabled={isProcessingTurn}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Game</span>
            </button>
          </div>
        </div>

        {/* Compact Claim Dialog - Positioned at top right */}
        {showClaimDialog && (
          <div className="fixed top-4 right-4 z-40 max-w-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">Claim Tile?</h3>
                <button
                  onClick={handleSkipClaim}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {claimOptions.map((option, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800 text-sm">{option.label}</h4>
                      <button
                        onClick={() => handleClaim(option)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm transition-colors"
                      >
                        Claim
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-600">Your:</span>
                      {option.tiles.map((tile, tileIndex) => (
                        <TileComponent
                          key={tileIndex}
                          tile={tile}
                          className="scale-50"
                        />
                      ))}
                      <span className="text-xs text-gray-600">+</span>
                      <TileComponent
                        tile={option.discardedTile}
                        className="scale-50 border-2 border-amber-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSkipClaim}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Winner */}
        {gameState.gamePhase === 'finished' && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 mb-6 text-center">
            <Trophy className="w-12 h-12 text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-white text-lg">
              {gameState.players.find(p => p.id === gameState.winner)?.name} wins with Mahjong!
            </p>
            <button
              onClick={initializeGame}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Other Players */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {gameState.players.slice(1).map((player, index) => (
            <div
              key={player.id}
              className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 ${
                gameState.currentPlayer === index + 1 ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{player.name}</span>
                  {gameState.currentPlayer === index + 1 && (
                    <span className="text-amber-300 text-xs">●</span>
                  )}
                </div>
                <span className="text-emerald-200 text-sm">
                  {player.hand.length} tiles
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: player.hand.length }, (_, i) => (
                  <div
                    key={i}
                    className="w-6 h-8 bg-gradient-to-b from-red-800 to-red-900 rounded-sm border border-red-700"
                  />
                ))}
              </div>
              {/* Exposed Sets */}
              {player.exposedSets.length > 0 && (
                <div className="mt-3">
                  <div className="text-emerald-200 text-xs mb-2">Exposed Sets:</div>
                  <div className="flex flex-wrap gap-2">
                    {player.exposedSets.map((set, setIndex) => (
                      <div key={setIndex} className="flex gap-0.5 bg-white/5 rounded-lg p-1">
                        {set.map((tile, tileIndex) => (
                          <TileComponent
                            key={tileIndex}
                            tile={tile}
                            className="scale-[0.3] border border-emerald-400/50"
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

        {/* Optimized Discard History */}
        <div className="mb-6">
          <DiscardHistory 
            discardPile={activeDiscards} 
            players={gameState.players.map(p => ({ id: p.id, name: p.name }))}
          />
        </div>

        {/* Drawn Tile Section */}
        {drawnTile && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-6">
            <h3 className="text-white font-medium mb-3">Drawn Tile</h3>
            <div className="flex items-center space-x-4">
              <TileComponent
                tile={drawnTile}
                isDrawn={true}
                onClick={handleDrawnTileClick}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleKeepDrawnTile}
                  disabled={isProcessingTurn || !isPlayerTurn}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Keep Tile
                </button>
                <button
                  onClick={handleDiscardDrawnTile}
                  disabled={isProcessingTurn || !isPlayerTurn || !turnActions.canDiscard}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Discard Tile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Hand */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium text-lg">
              Your Hand
              {isPlayerTurn && (
                <span className="ml-2 text-amber-300 text-sm">● Your Turn</span>
              )}
            </h3>
            <div className="flex space-x-2">
              {isPlayerTurn && gameState.gamePhase === 'playing' && turnActions.canDraw && (
                <button
                  onClick={handleDrawTile}
                  disabled={gameState.wall.length === 0 || isProcessingTurn}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Draw Tile
                </button>
              )}
              {selectedTileIndex !== null && isPlayerTurn && gameState.gamePhase === 'playing' && turnActions.canDiscard && (
                <button
                  onClick={handlePlayerDiscard}
                  disabled={isProcessingTurn}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Discard Selected
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {playerHand.map((tile, index) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={selectedTileIndex === index}
                onClick={() => handlePlayerTileClick(index)}
              />
            ))}
          </div>

          {/* Player's Exposed Sets */}
          {gameState.players[0].exposedSets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white font-medium mb-3">Your Exposed Sets:</h4>
              <div className="flex flex-wrap gap-4">
                {gameState.players[0].exposedSets.map((set, setIndex) => (
                  <div key={setIndex} className="flex gap-1 bg-emerald-500/10 rounded-lg p-3 border border-emerald-400/30">
                    <div className="text-emerald-200 text-xs mr-2 self-center">
                      Set {setIndex + 1}:
                    </div>
                    {set.map((tile, tileIndex) => (
                      <TileComponent
                        key={tileIndex}
                        tile={tile}
                        className="scale-75 border border-emerald-400/50"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-emerald-200 text-sm">
            <p>Tiles in hand: {playerHand.length}</p>
            {selectedTileIndex !== null && (
              <p>Selected tile: {playerHand[selectedTileIndex].type} {playerHand[selectedTileIndex].value || playerHand[selectedTileIndex].dragon || playerHand[selectedTileIndex].wind}</p>
            )}
            {drawnTile && (
              <p className="text-blue-300 font-medium">You drew a tile! Choose to keep it or discard it.</p>
            )}
            {isPlayerTurn && gameState.gamePhase === 'playing' && (
              <div className="mt-2">
                {isFirstTurn && (
                  <p className="text-amber-300 font-medium">As the dealer, you must discard first since you start with 14 tiles.</p>
                )}
                {!isFirstTurn && turnActions.canDraw && !drawnTile && (
                  <p className="text-amber-300 font-medium">You can draw a tile.</p>
                )}
                {turnActions.canDiscard && (
                  <p className="text-green-300 font-medium">You can discard a tile.</p>
                )}
                {!isFirstTurn && !turnActions.canDraw && !turnActions.canDiscard && (
                  <p className="text-gray-300 font-medium">Turn complete - waiting for next turn.</p>
                )}
              </div>
            )}
            {isProcessingTurn && (
              <p className="text-amber-300 font-medium">Processing turn...</p>
            )}
            {!isPlayerTurn && gameState.gamePhase === 'playing' && (
              <p className="text-gray-300 font-medium">Wait for your turn...</p>
            )}
            {gameState.gamePhase === 'finished' && (
              <p className="text-amber-300 font-medium">Game finished! Start a new game to continue playing.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
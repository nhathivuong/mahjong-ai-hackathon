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
  type: 'chow' | 'pung' | 'kong' | 'win';
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

  // Helper function to sort exposed sets for display
  const sortExposedSet = (set: Tile[]): Tile[] => {
    // If it's a sequence (chow), sort by value
    if (set.length === 3 && set[0].type === set[1].type && set[0].type === set[2].type) {
      const hasValues = set.every(tile => tile.value !== undefined);
      if (hasValues) {
        // Check if it's a sequence (consecutive values)
        const values = set.map(tile => tile.value!).sort((a, b) => a - b);
        if (values[1] === values[0] + 1 && values[2] === values[1] + 1) {
          // It's a chow - sort by value
          return [...set].sort((a, b) => a.value! - b.value!);
        }
      }
    }
    
    // For pung, kong, or non-sequences, keep original order
    return set;
  };

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

  // Check if a hand can win with the discarded tile
  const canWinWithDiscard = (hand: Tile[], discardedTile: Tile): boolean => {
    const testHand = [...hand, discardedTile];
    return isWinningHand(testHand);
  };

  // Check if current hand is winning (for self-drawn wins)
  const checkWinningHand = (hand: Tile[]): boolean => {
    return isWinningHand(hand);
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
        // For pung, kong, and win, just add them as they don't have duplicates
        uniqueOptions.push(option);
      }
    });

    return uniqueOptions;
  };

  const checkClaimOptions = useCallback((discardedTile: Tile, playerHand: Tile[]): ClaimOption[] => {
    const options: ClaimOption[] = [];

    // Check for Win first (highest priority)
    if (canWinWithDiscard(playerHand, discardedTile)) {
      options.push({
        type: 'win',
        tiles: [],
        label: 'Mahjong!',
        discardedTile
      });
    }

    // Check for Kong
    const kongTiles = canFormKong(playerHand, discardedTile);
    if (kongTiles) {
      options.push({
        type: 'kong',
        tiles: kongTiles,
        label: 'Kong',
        discardedTile
      });
    }

    // Check for Pung
    const pungTiles = canFormPung(playerHand, discardedTile);
    if (pungTiles) {
      options.push({
        type: 'pung',
        tiles: pungTiles,
        label: 'Pung',
        discardedTile
      });
    }

    // Check for Chow (only from previous player)
    const chowOptions = canFormChow(playerHand, discardedTile);
    chowOptions.forEach((chowTiles) => {
      options.push({
        type: 'chow',
        tiles: chowTiles,
        label: 'Chow',
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

    // Check for winning condition for bots (self-drawn win)
    if (playerIndex !== 0 && checkWinningHand(newPlayers[playerIndex].hand)) {
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

    // Check if any player can claim the discarded tile (including win)
    let claimFound = false;
    
    // Check human player first (if it's not their own discard)
    if (playerIndex !== 0) {
      const humanPlayerHand = newPlayers[0].hand;
      const claimOpts = checkClaimOptions(discardedTile, humanPlayerHand);
      
      if (claimOpts.length > 0) {
        setClaimOptions(claimOpts);
        setShowClaimDialog(true);
        setIsProcessingTurn(false);
        claimFound = true;
      }
    }

    // Check bots for winning condition (they auto-claim wins)
    if (!claimFound) {
      for (let i = 1; i < 4; i++) {
        if (i !== playerIndex && canWinWithDiscard(newPlayers[i].hand, discardedTile)) {
          // Bot wins by claiming the discarded tile
          setGameState(prev => prev ? {
            ...prev,
            gamePhase: 'finished',
            winner: newPlayers[i].id
          } : null);
          playSound('win');
          setIsProcessingTurn(false);
          claimFound = true;
          break;
        }
      }
    }

    // Continue to next turn if no claims
    if (!claimFound) {
      setTimeout(() => {
        continueToNextTurn(newGameState);
      }, 800);
    }
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
    
    // Handle win claim
    if (option.type === 'win') {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: humanPlayer.id
      } : null);
      playSound('win');
      setShowClaimDialog(false);
      setClaimOptions([]);
      return;
    }
    
    // Remove tiles from hand for other claims
    option.tiles.forEach(tile => {
      const index = humanPlayer.hand.findIndex(t => t.id === tile.id);
      if (index !== -1) {
        humanPlayer.hand.splice(index, 1);
      }
    });

    // Add the claimed set to exposed sets - SORT CHOWS IN ORDER
    let claimedSet = [...option.tiles, lastDiscard.tile];
    
    // Sort the claimed set if it's a chow (sequence)
    if (option.type === 'chow') {
      claimedSet = claimedSet.sort((a, b) => a.value! - b.value!);
    }
    
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

    // Check for winning condition after claiming
    if (checkWinningHand([...humanPlayer.hand, ...humanPlayer.exposedSets.flat()])) {
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

        // Check for winning condition (self-drawn)
        if (checkWinningHand(newPlayers[botIndex].hand)) {
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
            
            // Check if human player can claim this discard (including win)
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
            } else {
              // Check if other bots can win with this discard
              for (let i = 1; i < 4; i++) {
                if (i !== botIndex && i !== nextPlayer && canWinWithDiscard(newPlayers[i].hand, discardedTile)) {
                  // Bot wins by claiming the discarded tile
                  setGameState(prev => prev ? {
                    ...prev,
                    gamePhase: 'finished',
                    winner: newPlayers[i].id
                  } : null);
                  playSound('win');
                  setIsProcessingTurn(false);
                  return;
                }
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

    // Check for winning condition (self-drawn win)
    if (checkWinningHand(newPlayers[0].hand)) {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: newPlayers[0].id
      } : null);
      playSound('win');
    }
  };

  // Add manual win declaration button
  const handleDeclareWin = () => {
    if (!gameState || gameState.currentPlayer !== 0 || gameState.gamePhase !== 'playing') return;
    
    const playerHand = drawnTile ? [...gameState.players[0].hand, drawnTile] : gameState.players[0].hand;
    
    if (checkWinningHand(playerHand)) {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: 'player1'
      } : null);
      playSound('win');
    } else {
      showErrorMessage("Your hand is not a winning hand yet.");
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

  // Check if player can declare win
  const canDeclareWin = isPlayerTurn && gameState.gamePhase === 'playing' && 
    checkWinningHand(drawnTile ? [...playerHand, drawnTile] : playerHand);

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
    <div className="min-h-screen p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Error Message */}
        {showError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-[90vw]">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base truncate">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Audio Settings Modal */}
        {showAudioSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Audio Settings</h3>
              
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

        {/* Mobile-Optimized Game Header */}
        <div className="mb-4 sm:mb-6">
          {/* Top Row - Game Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                <span className="text-white font-medium text-xs sm:text-sm">Round {gameState.round}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                <span className="text-white font-medium text-xs sm:text-sm">
                  Turn {gameState.turnNumber}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                <span className="text-white font-medium text-xs sm:text-sm">
                  <span className="hidden sm:inline">Current: </span>{currentPlayer.name}
                  {isProcessingTurn && <span className="ml-1 sm:ml-2 text-amber-300">⏳</span>}
                </span>
              </div>
            </div>
            
            {/* Controls Row */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowAudioSettings(true)}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
                title="Audio Settings"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                <span className="text-white font-medium text-xs sm:text-sm">
                  Wall: {gameState.wall.length}
                </span>
              </div>
              <button
                onClick={initializeGame}
                disabled={isProcessingTurn}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 transition-colors text-xs sm:text-sm"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Game</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* Player Turn Status - Mobile Optimized */}
          {isPlayerTurn && (
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-400 mt-2">
              <div className="text-blue-200 font-medium text-xs sm:text-sm">
                {isFirstTurn ? (
                  <span>🎯 Dealer - Must Discard First</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <span className="flex items-center gap-1">
                      Draw: {turnActions.hasDrawn ? '✓' : turnActions.canDraw ? '○' : '✗'}
                    </span>
                    <span className="flex items-center gap-1">
                      Discard: {turnActions.hasDiscarded ? '✓' : turnActions.canDiscard ? '○' : '✗'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Claim Dialog - Mobile Optimized */}
        {showClaimDialog && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 w-[95vw] max-w-2xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-800">
                  {claimOptions.some(opt => opt.type === 'win') ? 'Winning Opportunity!' : 'Claim Discarded Tile?'}
                </h3>
                <div className="text-xs sm:text-sm text-gray-600">Choose an action or skip</div>
              </div>
              
              {/* Tiles Preview - Mobile Optimized */}
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg overflow-x-auto">
                {claimOptions.length > 0 && claimOptions[0].type !== 'win' && (
                  <>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-xs text-gray-600 font-medium">Your tiles:</span>
                      {claimOptions[0].tiles.map((tile, tileIndex) => (
                        <TileComponent
                          key={tileIndex}
                          tile={tile}
                          height="compact"
                          className="scale-75"
                        />
                      ))}
                    </div>
                    <span className="text-gray-400 font-bold">+</span>
                  </>
                )}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <span className="text-xs text-gray-600 font-medium">
                    {claimOptions.some(opt => opt.type === 'win') ? 'Winning tile:' : 'Claimed:'}
                  </span>
                  <TileComponent
                    tile={claimOptions[0].discardedTile}
                    height="compact"
                    className={`scale-75 border-2 ${claimOptions.some(opt => opt.type === 'win') ? 'border-green-400' : 'border-amber-400'}`}
                  />
                </div>
              </div>
              
              {/* Action Buttons - Mobile Responsive */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {claimOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleClaim(option)}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-white rounded-lg font-bold transition-all duration-200 hover:scale-105 shadow-lg text-sm sm:text-base ${
                      option.type === 'win' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 animate-pulse' :
                      option.type === 'chow' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
                      option.type === 'pung' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                      'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                
                {/* Skip Button */}
                <button
                  onClick={handleSkipClaim}
                  className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-bold transition-all duration-200 hover:scale-105 shadow-lg text-sm sm:text-base"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Winner */}
        {gameState.gamePhase === 'finished' && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-center">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-white text-base sm:text-lg">
              {gameState.players.find(p => p.id === gameState.winner)?.name} wins with Mahjong!
            </p>
            <button
              onClick={initializeGame}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Other Players with Exposed Sets - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {gameState.players.slice(1).map((player, index) => (
            <div
              key={player.id}
              className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 ${
                gameState.currentPlayer === index + 1 ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
                  <span className="text-white font-medium text-sm sm:text-base truncate">{player.name}</span>
                  {gameState.currentPlayer === index + 1 && (
                    <span className="text-amber-300 text-xs">●</span>
                  )}
                </div>
                <span className="text-emerald-200 text-xs sm:text-sm">
                  {player.hand.length} tiles
                </span>
              </div>
              
              {/* Hidden Hand Tiles */}
              <div className="flex flex-wrap gap-1 mb-3">
                {Array.from({ length: Math.min(player.hand.length, 14) }, (_, i) => (
                  <div
                    key={i}
                    className="w-4 h-6 sm:w-6 sm:h-8 bg-gradient-to-b from-red-800 to-red-900 rounded-sm border border-red-700"
                  />
                ))}
              </div>
              
              {/* Bot's Exposed Sets - WITH PROPER ORDERING */}
              {player.exposedSets.length > 0 && (
                <div className="mt-3">
                  <div className="text-emerald-200 text-xs mb-2">Exposed Sets:</div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {player.exposedSets.map((set, setIndex) => (
                      <div key={setIndex} className="flex gap-0.5 bg-white/5 rounded-lg p-1 border border-emerald-400/30">
                        {sortExposedSet(set).map((tile, tileIndex) => (
                          <TileComponent
                            key={tileIndex}
                            tile={tile}
                            height="compact"
                            className="scale-[0.5] sm:scale-[0.6] border border-emerald-400/50"
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
        <div className="mb-4 sm:mb-6">
          <DiscardHistory 
            discardPile={activeDiscards} 
            players={gameState.players.map(p => ({ id: p.id, name: p.name }))}
          />
        </div>

        {/* Drawn Tile Section - Mobile Optimized */}
        {drawnTile && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-white font-medium mb-3 text-sm sm:text-base">Drawn Tile</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <TileComponent
                tile={drawnTile}
                isDrawn={true}
                onClick={handleDrawnTileClick}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleKeepDrawnTile}
                  disabled={isProcessingTurn || !isPlayerTurn}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Keep Tile
                </button>
                <button
                  onClick={handleDiscardDrawnTile}
                  disabled={isProcessingTurn || !isPlayerTurn || !turnActions.canDiscard}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Discard Tile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Hand - Fixed Tile Width Issue */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h3 className="text-white font-medium text-base sm:text-lg">
              Your Hand
              {isPlayerTurn && (
                <span className="ml-2 text-amber-300 text-sm">● Your Turn</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {canDeclareWin && (
                <button
                  onClick={handleDeclareWin}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 sm:px-6 py-2 rounded-lg font-bold transition-all duration-200 hover:scale-105 shadow-lg animate-pulse text-sm sm:text-base"
                >
                  🎉 Declare Mahjong!
                </button>
              )}
              {isPlayerTurn && gameState.gamePhase === 'playing' && turnActions.canDraw && (
                <button
                  onClick={handleDrawTile}
                  disabled={gameState.wall.length === 0 || isProcessingTurn}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Draw Tile
                </button>
              )}
              {selectedTileIndex !== null && isPlayerTurn && gameState.gamePhase === 'playing' && turnActions.canDiscard && (
                <button
                  onClick={handlePlayerDiscard}
                  disabled={isProcessingTurn}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Discard Selected
                </button>
              )}
            </div>
          </div>
          
          {/* Hand Tiles - Fixed Layout with Proper Flex Wrap */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 justify-center sm:justify-start">
            {playerHand.map((tile, index) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={selectedTileIndex === index}
                onClick={() => handlePlayerTileClick(index)}
                className="flex-shrink-0"
              />
            ))}
          </div>

          {/* Player's Exposed Sets - WITH PROPER CHOW ORDERING */}
          {gameState.players[0].exposedSets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Your Exposed Sets:</h4>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                {gameState.players[0].exposedSets.map((set, setIndex) => (
                  <div key={setIndex} className="flex gap-1 bg-emerald-500/10 rounded-lg p-2 sm:p-3 border border-emerald-400/30">
                    {sortExposedSet(set).map((tile, tileIndex) => (
                      <TileComponent
                        key={tileIndex}
                        tile={tile}
                        className="scale-[0.6] sm:scale-75 border border-emerald-400/50"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Game Status - Mobile Optimized */}
          <div className="text-emerald-200 text-xs sm:text-sm space-y-1">
            <p>Tiles in hand: {playerHand.length}</p>
            {selectedTileIndex !== null && (
              <p>Selected tile: {playerHand[selectedTileIndex].type} {playerHand[selectedTileIndex].value || playerHand[selectedTileIndex].dragon || playerHand[selectedTileIndex].wind}</p>
            )}
            {drawnTile && (
              <p className="text-blue-300 font-medium">You drew a tile! Choose to keep it or discard it.</p>
            )}
            {canDeclareWin && (
              <p className="text-green-300 font-bold animate-pulse">🎉 You have a winning hand! Click "Declare Mahjong!" to win!</p>
            )}
            {isPlayerTurn && gameState.gamePhase === 'playing' && (
              <div className="mt-2 space-y-1">
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
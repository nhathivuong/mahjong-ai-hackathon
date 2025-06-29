import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Tile, DiscardedTile } from '../types/mahjong';
import { createTileSet, shuffleTiles, sortTiles, canFormChow, canFormPung, canFormKong, isWinningHand, analyzeWinningHand, isOneAwayFromWin, calculateWinScore, checkDrawCondition, calculateDrawScores } from '../utils/tileUtils';
import TileComponent from './TileComponent';
import DiscardHistory from './DiscardHistory';
import BotActionIndicator, { BotActionType } from './BotActionIndicator';
import { SoundManager } from '../utils/soundUtils';

interface GameBoardProps {
  gameMode: 'bot' | 'multiplayer';
}

const GameBoard: React.FC<GameBoardProps> = ({ gameMode }) => {
  const soundManager = SoundManager.getInstance();

  // Initialize game state
  const initializeGame = (): GameState => {
    const tiles = shuffleTiles(createTileSet());
    
    const players: Player[] = [
      { id: 'player1', name: 'You', hand: [], exposedSets: [], score: 0, isDealer: true, isBot: false },
      { id: 'bot1', name: 'East Bot', hand: [], exposedSets: [], score: 0, isDealer: false, isBot: true },
      { id: 'bot2', name: 'South Bot', hand: [], exposedSets: [], score: 0, isDealer: false, isBot: true },
      { id: 'bot3', name: 'West Bot', hand: [], exposedSets: [], score: 0, isDealer: false, isBot: true }
    ];

    // Deal 13 tiles to each player
    let tileIndex = 0;
    for (let i = 0; i < 13; i++) {
      players.forEach(player => {
        if (tileIndex < tiles.length) {
          player.hand.push(tiles[tileIndex++]);
        }
      });
    }

    // Give dealer (player1) one extra tile
    if (tileIndex < tiles.length) {
      players[0].hand.push(tiles[tileIndex++]);
    }

    // Sort all hands
    players.forEach(player => {
      player.hand = sortTiles(player.hand);
    });

    return {
      players,
      currentPlayer: 0, // Dealer starts
      wall: tiles.slice(tileIndex),
      discardPile: [],
      round: 1,
      gamePhase: 'playing',
      turnNumber: 1,
      lastActionWasClaim: false
    };
  };

  const [gameState, setGameState] = useState<GameState>(initializeGame);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [showClaimOptions, setShowClaimOptions] = useState(false);
  const [claimOptions, setClaimOptions] = useState<{
    chow: Tile[][];
    pung: Tile[] | null;
    kong: Tile[] | null;
    discardedTile: Tile | null;
    discardingPlayer: number;
  }>({ chow: [], pung: null, kong: null, discardedTile: null, discardingPlayer: -1 });
  const [botAction, setBotAction] = useState<{
    action: BotActionType;
    playerName: string;
    tiles?: Tile[];
  } | null>(null);

  // Calculate expected hand size based on exposed sets
  const calculateExpectedHandSize = (player: Player, isCurrentPlayer: boolean = false): { min: number; max: number } => {
    // Each exposed set reduces hand size by the number of tiles in that set
    const exposedTileCount = player.exposedSets.reduce((total, set) => total + set.length, 0);
    const baseHandSize = 14 - exposedTileCount; // Start with 14 total tiles
    
    if (isCurrentPlayer) {
      // Current player should have 14 total tiles (hand + exposed)
      return { min: baseHandSize, max: baseHandSize };
    } else {
      // Non-current players should have 13 total tiles (hand + exposed)
      return { min: baseHandSize - 1, max: baseHandSize - 1 };
    }
  };

  // Validate hand sizes (non-throwing version)
  const validateHandSizes = (state: GameState): boolean => {
    try {
      for (let i = 0; i < state.players.length; i++) {
        const player = state.players[i];
        const isCurrentPlayer = i === state.currentPlayer;
        const actualHandSize = player.hand.length;
        const exposedTileCount = player.exposedSets.reduce((total, set) => total + set.length, 0);
        const totalTiles = actualHandSize + exposedTileCount;
        
        // Expected total tiles
        const expectedTotal = isCurrentPlayer ? 14 : 13;
        
        // Allow some flexibility in validation (±2 tiles to account for game state transitions)
        if (totalTiles < expectedTotal - 2 || totalTiles > expectedTotal + 2) {
          console.warn(`⚠️ ${player.name} has unusual tile count: ${totalTiles} (expected ~${expectedTotal})`);
          console.warn(`   Hand: ${actualHandSize}, Exposed: ${exposedTileCount}`);
          // Don't return false - just log the warning and continue
        }
      }
      return true;
    } catch (error) {
      console.error('Error in hand size validation:', error);
      return true; // Continue game even if validation fails
    }
  };

  // Handle tile selection
  const handleTileSelect = (tile: Tile) => {
    if (gameState.currentPlayer !== 0 || gameState.gamePhase !== 'playing') return;
    
    setSelectedTile(selectedTile?.id === tile.id ? null : tile);
  };

  // Handle tile discard
  const handleDiscard = (tile: Tile) => {
    if (gameState.currentPlayer !== 0 || gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[0];
    const tileIndex = currentPlayer.hand.findIndex(t => t.id === tile.id);
    if (tileIndex === -1) return;

    // Create new game state
    const newState = { ...gameState };
    newState.players = gameState.players.map(p => ({ ...p, hand: [...p.hand], exposedSets: [...p.exposedSets] }));
    
    // Remove tile from player's hand
    newState.players[0].hand.splice(tileIndex, 1);
    
    // Add to discard pile
    const discardedTile: DiscardedTile = {
      tile,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      turnNumber: gameState.turnNumber
    };
    newState.discardPile = [...gameState.discardPile, discardedTile];
    
    // Check if any other player can claim this tile
    const claimingOptions = checkClaimOptions(newState, tile, 0);
    
    if (claimingOptions.canClaim) {
      setClaimOptions({
        chow: claimingOptions.chow,
        pung: claimingOptions.pung,
        kong: claimingOptions.kong,
        discardedTile: tile,
        discardingPlayer: 0
      });
      setShowClaimOptions(true);
      setGameState(newState);
    } else {
      // Move to next player
      newState.currentPlayer = (gameState.currentPlayer + 1) % 4;
      newState.turnNumber += 1;
      newState.lastActionWasClaim = false;
      setGameState(newState);
    }
    
    setSelectedTile(null);
    soundManager.playTileSound('discard', 'bottom');
  };

  // Check claim options for all players
  const checkClaimOptions = (state: GameState, discardedTile: Tile, discardingPlayer: number) => {
    let canClaim = false;
    let chow: Tile[][] = [];
    let pung: Tile[] | null = null;
    let kong: Tile[] | null = null;

    // Check each player (except the discarding player)
    for (let i = 0; i < state.players.length; i++) {
      if (i === discardingPlayer) continue;
      
      const player = state.players[i];
      
      // Check for kong (highest priority)
      const kongTiles = canFormKong(player.hand, discardedTile);
      if (kongTiles && !kong) {
        kong = kongTiles;
        canClaim = true;
      }
      
      // Check for pung
      const pungTiles = canFormPung(player.hand, discardedTile);
      if (pungTiles && !pung) {
        pung = pungTiles;
        canClaim = true;
      }
      
      // Check for chow (only from previous player)
      const prevPlayer = (discardingPlayer + 3) % 4;
      if (i === prevPlayer) {
        const chowTiles = canFormChow(player.hand, discardedTile);
        if (chowTiles.length > 0) {
          chow = chowTiles;
          canClaim = true;
        }
      }
    }

    return { canClaim, chow, pung, kong };
  };

  // Handle claim action
  const handleClaim = (action: 'chow' | 'pung' | 'kong', tiles?: Tile[]) => {
    if (!claimOptions.discardedTile) return;

    const newState = { ...gameState };
    newState.players = gameState.players.map(p => ({ ...p, hand: [...p.hand], exposedSets: [...p.exposedSets.map(set => [...set])] }));
    
    // Find the claiming player
    let claimingPlayer = -1;
    
    if (action === 'chow') {
      // Chow can only be claimed by the next player
      claimingPlayer = (claimOptions.discardingPlayer + 1) % 4;
    } else {
      // Pung and Kong can be claimed by any player
      for (let i = 0; i < newState.players.length; i++) {
        if (i === claimOptions.discardingPlayer) continue;
        
        const player = newState.players[i];
        if (action === 'pung' && canFormPung(player.hand, claimOptions.discardedTile)) {
          claimingPlayer = i;
          break;
        } else if (action === 'kong' && canFormKong(player.hand, claimOptions.discardedTile)) {
          claimingPlayer = i;
          break;
        }
      }
    }
    
    if (claimingPlayer === -1) return;
    
    const player = newState.players[claimingPlayer];
    
    // Remove tiles from player's hand and create exposed set
    if (action === 'chow' && tiles) {
      // Remove the two tiles from hand
      tiles.forEach(tile => {
        const index = player.hand.findIndex(t => t.id === tile.id);
        if (index !== -1) {
          player.hand.splice(index, 1);
        }
      });
      // Create exposed set with discarded tile + hand tiles
      const exposedSet = [claimOptions.discardedTile, ...tiles];
      player.exposedSets.push(exposedSet);
    } else if (action === 'pung') {
      const pungTiles = canFormPung(player.hand, claimOptions.discardedTile);
      if (pungTiles) {
        // Remove 2 matching tiles from hand
        pungTiles.forEach(tile => {
          const index = player.hand.findIndex(t => t.id === tile.id);
          if (index !== -1) {
            player.hand.splice(index, 1);
          }
        });
        // Create exposed set
        const exposedSet = [claimOptions.discardedTile, ...pungTiles];
        player.exposedSets.push(exposedSet);
      }
    } else if (action === 'kong') {
      const kongTiles = canFormKong(player.hand, claimOptions.discardedTile);
      if (kongTiles) {
        // Remove 3 matching tiles from hand
        kongTiles.forEach(tile => {
          const index = player.hand.findIndex(t => t.id === tile.id);
          if (index !== -1) {
            player.hand.splice(index, 1);
          }
        });
        // Create exposed set
        const exposedSet = [claimOptions.discardedTile, ...kongTiles];
        player.exposedSets.push(exposedSet);
      }
    }
    
    // Remove the discarded tile from discard pile (it's been claimed)
    newState.discardPile = newState.discardPile.slice(0, -1);
    
    // Set current player to the claiming player
    newState.currentPlayer = claimingPlayer;
    newState.lastActionWasClaim = true;
    
    // Sort the claiming player's hand
    player.hand = sortTiles(player.hand);
    
    setGameState(newState);
    setShowClaimOptions(false);
    setClaimOptions({ chow: [], pung: null, kong: null, discardedTile: null, discardingPlayer: -1 });
    
    soundManager.playTileSound('claim', 'center');
  };

  // Skip claim
  const handleSkipClaim = () => {
    const newState = { ...gameState };
    newState.currentPlayer = (gameState.currentPlayer + 1) % 4;
    newState.turnNumber += 1;
    newState.lastActionWasClaim = false;
    setGameState(newState);
    setShowClaimOptions(false);
    setClaimOptions({ chow: [], pung: null, kong: null, discardedTile: null, discardingPlayer: -1 });
  };

  // Draw tile for current player
  const drawTile = (state: GameState): GameState => {
    if (state.wall.length === 0) return state;
    
    const newState = { ...state };
    newState.players = state.players.map(p => ({ ...p, hand: [...p.hand], exposedSets: [...p.exposedSets] }));
    newState.wall = [...state.wall];
    
    const drawnTile = newState.wall.pop()!;
    newState.players[state.currentPlayer].hand.push(drawnTile);
    newState.players[state.currentPlayer].hand = sortTiles(newState.players[state.currentPlayer].hand);
    
    return newState;
  };

  // Execute bot turn
  const executeBotTurn = useCallback((state: GameState): GameState => {
    try {
      const currentPlayer = state.players[state.currentPlayer];
      
      // Validate hand sizes (non-throwing)
      validateHandSizes(state);
      
      let newState = { ...state };
      
      // If player doesn't have enough tiles and it's not due to claims, draw a tile
      const expectedHandSize = calculateExpectedHandSize(currentPlayer, true);
      if (!state.lastActionWasClaim && currentPlayer.hand.length < expectedHandSize.min && state.wall.length > 0) {
        newState = drawTile(newState);
      }
      
      const player = newState.players[newState.currentPlayer];
      
      // Check for winning hand
      if (isWinningHand(player.hand, player.exposedSets)) {
        setBotAction({
          action: 'win',
          playerName: player.name,
          tiles: player.hand.slice(0, 5) // Show first 5 tiles
        });
        
        setTimeout(() => {
          newState.gamePhase = 'finished';
          newState.winner = player.id;
          newState.winType = 'self-drawn';
          newState.winScore = calculateWinScore(player.hand, player.exposedSets, 'self-drawn', player.isDealer);
          setGameState(newState);
          setBotAction(null);
          soundManager.playWinSound();
        }, 2000);
        
        return newState;
      }
      
      // Simple bot AI: discard a random tile
      if (player.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * player.hand.length);
        const tileToDiscard = player.hand[randomIndex];
        
        // Remove tile from hand
        newState.players = newState.players.map(p => ({ ...p, hand: [...p.hand], exposedSets: [...p.exposedSets] }));
        newState.players[newState.currentPlayer].hand.splice(randomIndex, 1);
        
        // Add to discard pile
        const discardedTile: DiscardedTile = {
          tile: tileToDiscard,
          playerId: player.id,
          playerName: player.name,
          turnNumber: state.turnNumber
        };
        newState.discardPile = [...newState.discardPile, discardedTile];
        
        // Check if human player can claim
        const claimingOptions = checkClaimOptions(newState, tileToDiscard, newState.currentPlayer);
        
        if (claimingOptions.canClaim && newState.currentPlayer !== 0) {
          setClaimOptions({
            chow: claimingOptions.chow,
            pung: claimingOptions.pung,
            kong: claimingOptions.kong,
            discardedTile: tileToDiscard,
            discardingPlayer: newState.currentPlayer
          });
          setShowClaimOptions(true);
        } else {
          // Move to next player
          newState.currentPlayer = (newState.currentPlayer + 1) % 4;
          newState.turnNumber += 1;
        }
        
        newState.lastActionWasClaim = false;
        
        // Play sound based on bot position
        const positions = ['bottom', 'right', 'top', 'left'];
        soundManager.playTileSound('discard', positions[newState.currentPlayer] as any);
      }
      
      return newState;
    } catch (error) {
      console.error('Error in bot turn execution:', error);
      // Return current state if error occurs
      return state;
    }
  }, [soundManager]);

  // Auto-execute bot turns
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    if (gameState.players[gameState.currentPlayer].isBot && !showClaimOptions) {
      const timer = setTimeout(() => {
        setGameState(prevState => executeBotTurn(prevState));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.gamePhase, showClaimOptions, executeBotTurn]);

  // Check for draw conditions
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const drawReason = checkDrawCondition(gameState.wall.length, gameState.turnNumber);
    if (drawReason) {
      const finalScores = calculateDrawScores(gameState.players.map(p => ({
        hand: p.hand,
        exposedSets: p.exposedSets,
        isDealer: p.isDealer
      })));
      
      setGameState(prev => ({
        ...prev,
        gamePhase: 'draw',
        drawReason,
        finalScores
      }));
      
      soundManager.playTransitionSound('round-end');
    }
  }, [gameState.wall.length, gameState.turnNumber, gameState.gamePhase, soundManager]);

  // Handle human player's turn (draw tile if needed)
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    if (gameState.currentPlayer === 0 && !gameState.players[0].isBot && !showClaimOptions) {
      const player = gameState.players[0];
      const expectedHandSize = calculateExpectedHandSize(player, true);
      
      // Draw tile if player doesn't have enough tiles and last action wasn't a claim
      if (!gameState.lastActionWasClaim && player.hand.length < expectedHandSize.min && gameState.wall.length > 0) {
        setGameState(prevState => drawTile(prevState));
        soundManager.playTileSound('draw', 'bottom');
      }
    }
  }, [gameState.currentPlayer, gameState.gamePhase, showClaimOptions, gameState.lastActionWasClaim, soundManager]);

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const humanPlayer = gameState.players[0];

  if (gameState.gamePhase === 'finished') {
    const winner = gameState.players.find(p => p.id === gameState.winner);
    const winningHand = winner ? analyzeWinningHand(winner.hand, winner.exposedSets) : null;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
          <p className="text-2xl text-amber-400 mb-6">
            {winner?.name} Wins!
          </p>
          
          {winningHand && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Winning Hand</h3>
              <div className="bg-emerald-800/30 rounded-xl p-4 mb-4">
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {winningHand.allTiles.map((tile, index) => (
                    <TileComponent
                      key={`${tile.id}-${index}`}
                      tile={tile}
                      className="shadow-lg"
                    />
                  ))}
                </div>
                <div className="text-emerald-200 text-sm">
                  <p><strong>Hand Type:</strong> {winningHand.handType}</p>
                  <p><strong>Win Type:</strong> {gameState.winType === 'self-drawn' ? 'Self-drawn' : 'Claimed'}</p>
                  <p><strong>Score:</strong> {gameState.winScore} points</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setGameState(initializeGame())}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 hover:scale-105"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (gameState.gamePhase === 'draw') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">🤝</div>
          <h2 className="text-4xl font-bold text-white mb-4">Draw Game!</h2>
          <p className="text-xl text-emerald-200 mb-6">
            {gameState.drawReason === 'wall-exhausted' 
              ? 'The wall has been exhausted with no winner.' 
              : 'Too many turns have passed without a winner.'}
          </p>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Final Scores</h3>
            <div className="space-y-2">
              {gameState.players.map((player, index) => (
                <div key={player.id} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                  <span className="text-white font-medium">{player.name}</span>
                  <span className="text-emerald-300">{gameState.finalScores?.[index] || 0} points</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setGameState(initializeGame())}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 hover:scale-105"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Game Info Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center space-x-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
            <div className="text-white">
              <span className="text-sm text-emerald-200">Round</span>
              <div className="font-bold">{gameState.round}</div>
            </div>
            <div className="text-white">
              <span className="text-sm text-emerald-200">Turn</span>
              <div className="font-bold">{gameState.turnNumber}</div>
            </div>
            <div className="text-white">
              <span className="text-sm text-emerald-200">Wall</span>
              <div className="font-bold">{gameState.wall.length}</div>
            </div>
            <div className="text-white">
              <span className="text-sm text-emerald-200">Current</span>
              <div className="font-bold">{currentPlayer.name}</div>
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Game Board - Takes up 3 columns */}
          <div className="xl:col-span-3">
            <div className="relative w-full aspect-square max-w-4xl mx-auto bg-emerald-800/30 rounded-2xl border border-emerald-600/30 overflow-hidden">
              
              {/* Bottom Player (Human) */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4">
                <div className="text-center mb-3">
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                    gameState.currentPlayer === 0 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'bg-white/20 text-white'
                  }`}>
                    <span className="mr-2">{humanPlayer.name}</span>
                    {gameState.currentPlayer === 0 && <span className="animate-pulse">●</span>}
                  </div>
                  <div className="text-xs text-emerald-200 mt-1">
                    Hand: {humanPlayer.hand.length} | Sets: {humanPlayer.exposedSets.length}
                  </div>
                </div>

                {/* Exposed Sets */}
                {humanPlayer.exposedSets.length > 0 && (
                  <div className="mb-3 flex justify-center">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {humanPlayer.exposedSets.map((set, setIndex) => (
                        <div key={setIndex} className="flex gap-1 bg-white/10 rounded-lg p-2">
                          {set.map((tile, tileIndex) => (
                            <TileComponent
                              key={`${tile.id}-${tileIndex}`}
                              tile={tile}
                              height="compact"
                              className="opacity-90"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Player Hand */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {humanPlayer.hand.map((tile) => (
                    <TileComponent
                      key={tile.id}
                      tile={tile}
                      isSelected={selectedTile?.id === tile.id}
                      onClick={() => handleTileSelect(tile)}
                      className="hover:scale-105 transition-transform cursor-pointer"
                    />
                  ))}
                </div>

                {/* Discard Button */}
                {gameState.currentPlayer === 0 && selectedTile && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => handleDiscard(selectedTile)}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Discard Selected Tile
                    </button>
                  </div>
                )}
              </div>

              {/* Right Player (Bot 1) */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="text-center mb-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                    gameState.currentPlayer === 1 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'bg-white/20 text-white'
                  }`}>
                    <span className="mr-2">{gameState.players[1].name}</span>
                    {gameState.currentPlayer === 1 && <span className="animate-pulse">●</span>}
                  </div>
                  <div className="text-xs text-emerald-200 mt-1">
                    Hand: {gameState.players[1].hand.length} | Sets: {gameState.players[1].exposedSets.length}
                  </div>
                </div>

                {/* Exposed Sets */}
                {gameState.players[1].exposedSets.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-col gap-1">
                      {gameState.players[1].exposedSets.map((set, setIndex) => (
                        <div key={setIndex} className="flex gap-0.5 bg-white/10 rounded p-1">
                          {set.map((tile, tileIndex) => (
                            <TileComponent
                              key={`${tile.id}-${tileIndex}`}
                              tile={tile}
                              height="compact"
                              className="opacity-90"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bot Hand (Hidden) */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: gameState.players[1].hand.length }).map((_, index) => (
                    <div
                      key={index}
                      className="w-8 h-12 bg-gradient-to-b from-emerald-700 to-emerald-800 rounded border border-emerald-600 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Top Player (Bot 2) */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4">
                <div className="text-center mb-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                    gameState.currentPlayer === 2 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'bg-white/20 text-white'
                  }`}>
                    <span className="mr-2">{gameState.players[2].name}</span>
                    {gameState.currentPlayer === 2 && <span className="animate-pulse">●</span>}
                  </div>
                  <div className="text-xs text-emerald-200 mt-1">
                    Hand: {gameState.players[2].hand.length} | Sets: {gameState.players[2].exposedSets.length}
                  </div>
                </div>

                {/* Exposed Sets */}
                {gameState.players[2].exposedSets.length > 0 && (
                  <div className="mb-3 flex justify-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {gameState.players[2].exposedSets.map((set, setIndex) => (
                        <div key={setIndex} className="flex gap-0.5 bg-white/10 rounded p-1">
                          {set.map((tile, tileIndex) => (
                            <TileComponent
                              key={`${tile.id}-${tileIndex}`}
                              tile={tile}
                              height="compact"
                              className="opacity-90"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bot Hand (Hidden) */}
                <div className="flex gap-1 justify-center">
                  {Array.from({ length: gameState.players[2].hand.length }).map((_, index) => (
                    <div
                      key={index}
                      className="w-8 h-12 bg-gradient-to-b from-emerald-700 to-emerald-800 rounded border border-emerald-600 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Left Player (Bot 3) */}
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="text-center mb-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                    gameState.currentPlayer === 3 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'bg-white/20 text-white'
                  }`}>
                    <span className="mr-2">{gameState.players[3].name}</span>
                    {gameState.currentPlayer === 3 && <span className="animate-pulse">●</span>}
                  </div>
                  <div className="text-xs text-emerald-200 mt-1">
                    Hand: {gameState.players[3].hand.length} | Sets: {gameState.players[3].exposedSets.length}
                  </div>
                </div>

                {/* Exposed Sets */}
                {gameState.players[3].exposedSets.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-col gap-1">
                      {gameState.players[3].exposedSets.map((set, setIndex) => (
                        <div key={setIndex} className="flex gap-0.5 bg-white/10 rounded p-1">
                          {set.map((tile, tileIndex) => (
                            <TileComponent
                              key={`${tile.id}-${tileIndex}`}
                              tile={tile}
                              height="compact"
                              className="opacity-90"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bot Hand (Hidden) */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: gameState.players[3].hand.length }).map((_, index) => (
                    <div
                      key={index}
                      className="w-8 h-12 bg-gradient-to-b from-emerald-700 to-emerald-800 rounded border border-emerald-600 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Center Area */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-white font-medium mb-2">Current Turn</div>
                  <div className="text-amber-400 text-lg font-bold">{currentPlayer.name}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Discard History */}
          <div className="xl:col-span-1">
            <DiscardHistory 
              discardPile={gameState.discardPile} 
              players={gameState.players.map(p => ({ id: p.id, name: p.name }))}
            />
          </div>
        </div>

        {/* Claim Options Modal */}
        {showClaimOptions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4 text-center">Claim Options</h3>
              
              <div className="space-y-3">
                {claimOptions.chow.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Chow (Sequence)</h4>
                    {claimOptions.chow.map((chowTiles, index) => (
                      <button
                        key={index}
                        onClick={() => handleClaim('chow', chowTiles)}
                        className="w-full p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg transition-colors mb-2"
                      >
                        <div className="flex justify-center gap-1">
                          {[claimOptions.discardedTile, ...chowTiles].map((tile, tileIndex) => (
                            <TileComponent
                              key={tileIndex}
                              tile={tile!}
                              height="compact"
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {claimOptions.pung && (
                  <button
                    onClick={() => handleClaim('pung')}
                    className="w-full p-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded-lg transition-colors"
                  >
                    <div className="text-white font-medium mb-2">Pung (Triplet)</div>
                    <div className="flex justify-center gap-1">
                      {[claimOptions.discardedTile, ...claimOptions.pung].map((tile, index) => (
                        <TileComponent
                          key={index}
                          tile={tile!}
                          height="compact"
                        />
                      ))}
                    </div>
                  </button>
                )}
                
                {claimOptions.kong && (
                  <button
                    onClick={() => handleClaim('kong')}
                    className="w-full p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 rounded-lg transition-colors"
                  >
                    <div className="text-white font-medium mb-2">Kong (Quad)</div>
                    <div className="flex justify-center gap-1">
                      {[claimOptions.discardedTile, ...claimOptions.kong].map((tile, index) => (
                        <TileComponent
                          key={index}
                          tile={tile!}
                          height="compact"
                        />
                      ))}
                    </div>
                  </button>
                )}
              </div>
              
              <button
                onClick={handleSkipClaim}
                className="w-full mt-4 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-400/50 text-white rounded-lg transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Bot Action Indicator */}
        {botAction && (
          <BotActionIndicator
            action={botAction.action}
            playerName={botAction.playerName}
            tiles={botAction.tiles}
            onComplete={() => setBotAction(null)}
          />
        )}
      </div>
    </div>
  );
};

export default GameBoard;
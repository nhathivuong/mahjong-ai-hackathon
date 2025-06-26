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
import { Volume2, VolumeX, RotateCcw, Trophy, Users, Clock } from 'lucide-react';

interface GameBoardProps {
  gameMode: 'bot' | 'multiplayer';
}

interface BotAction {
  type: BotActionType;
  playerName: string;
  tiles?: Tile[]; // Changed from string[] to Tile[]
}

const GameBoard: React.FC<GameBoardProps> = ({ gameMode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [botAction, setBotAction] = useState<BotAction | null>(null);
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
      turnNumber: 1
    };

    setGameState(newGameState);
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

  // Bot AI logic
  const makeBotMove = useCallback((botPlayer: Player, gameState: GameState) => {
    const { wall, discardPile } = gameState;
    
    if (wall.length === 0) return gameState;

    // Draw a tile
    const drawnTile = wall[0];
    const newWall = wall.slice(1);
    const newHand = [...botPlayer.hand, drawnTile];

    // Check if bot can win with the drawn tile
    if (isWinningHand(newHand, botPlayer.exposedSets)) {
      const winScore = calculateWinScore(newHand, botPlayer.exposedSets, 'self-drawn', botPlayer.isDealer);
      
      // Show win indicator with winning tiles
      showBotAction('win', botPlayer.name, newHand.slice(-4)); // Show last 4 tiles as example
      
      return {
        ...gameState,
        gamePhase: 'finished' as const,
        winner: botPlayer.id,
        winType: 'self-drawn' as const,
        winScore,
        wall: newWall,
        players: gameState.players.map(p => 
          p.id === botPlayer.id 
            ? { ...p, hand: newHand, score: p.score + winScore }
            : p
        )
      };
    }

    // Check if bot can form kong with drawn tile
    const kongTiles = canFormKong(botPlayer.hand, drawnTile);
    if (kongTiles && Math.random() > 0.3) { // 70% chance to kong
      const newExposedSets = [...botPlayer.exposedSets, [drawnTile, ...kongTiles]];
      const remainingHand = botPlayer.hand.filter(tile => !kongTiles.includes(tile));
      
      // Show kong indicator with all 4 tiles
      showBotAction('kong', botPlayer.name, [drawnTile, ...kongTiles]);
      
      return {
        ...gameState,
        wall: newWall,
        players: gameState.players.map(p => 
          p.id === botPlayer.id 
            ? { ...p, hand: remainingHand, exposedSets: newExposedSets }
            : p
        )
      };
    }

    // Simple discard logic - discard a tile that doesn't help form sets
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
        
        // Show win indicator with winning tiles
        showBotAction('win', player.name, testHand.slice(-4)); // Show last 4 tiles as example
        
        return {
          ...gameState,
          gamePhase: 'finished' as const,
          winner: player.id,
          winType: 'claimed' as const,
          winScore,
          currentPlayer: playerIndex,
          players: gameState.players.map(p => 
            p.id === player.id 
              ? { ...p, hand: testHand, score: p.score + winScore }
              : p
          )
        };
      }

      // Check for kong (second priority)
      const kongTiles = canFormKong(player.hand, discardedTile.tile);
      if (kongTiles && Math.random() > 0.4) { // 60% chance
        const newExposedSets = [...player.exposedSets, [discardedTile.tile, ...kongTiles]];
        const newHand = player.hand.filter(tile => !kongTiles.includes(tile));
        
        // Show kong indicator with all 4 tiles
        showBotAction('kong', player.name, [discardedTile.tile, ...kongTiles]);
        
        return {
          ...gameState,
          currentPlayer: playerIndex,
          players: gameState.players.map(p => 
            p.id === player.id 
              ? { ...p, hand: newHand, exposedSets: newExposedSets }
              : p
          )
        };
      }

      // Check for pung (third priority)
      const pungTiles = canFormPung(player.hand, discardedTile.tile);
      if (pungTiles && Math.random() > 0.5) { // 50% chance
        const newExposedSets = [...player.exposedSets, [discardedTile.tile, ...pungTiles]];
        const newHand = player.hand.filter(tile => !pungTiles.includes(tile));
        
        // Show pung indicator with all 3 tiles
        showBotAction('pung', player.name, [discardedTile.tile, ...pungTiles]);
        
        return {
          ...gameState,
          currentPlayer: playerIndex,
          players: gameState.players.map(p => 
            p.id === player.id 
              ? { ...p, hand: newHand, exposedSets: newExposedSets }
              : p
          )
        };
      }

      // Check for chow (lowest priority, only from previous player)
      if (i === 1) { // Only immediate next player can chow
        const chowOptions = canFormChow(player.hand, discardedTile.tile);
        if (chowOptions.length > 0 && Math.random() > 0.6) { // 40% chance
          const chowTiles = chowOptions[0]; // Take first option
          const newExposedSets = [...player.exposedSets, [discardedTile.tile, ...chowTiles]];
          const newHand = player.hand.filter(tile => !chowTiles.includes(tile));
          
          // Show chow indicator with all 3 tiles in sequence
          const sequenceTiles = [discardedTile.tile, ...chowTiles].sort((a, b) => (a.value || 0) - (b.value || 0));
          showBotAction('chow', player.name, sequenceTiles);
          
          return {
            ...gameState,
            currentPlayer: playerIndex,
            players: gameState.players.map(p => 
              p.id === player.id 
                ? { ...p, hand: newHand, exposedSets: newExposedSets }
                : p
            )
          };
        }
      }
    }

    return null; // No claims
  }, []);

  // Bot discard selection logic
  const chooseBotDiscard = (hand: Tile[], exposedSets: Tile[][]): Tile => {
    // Simple strategy: discard tiles that are least likely to form sets
    const tileValues = new Map<string, number>();
    
    hand.forEach(tile => {
      const key = `${tile.type}-${tile.value || tile.dragon || tile.wind}`;
      tileValues.set(key, (tileValues.get(key) || 0) + 1);
    });

    // Prefer to keep pairs and potential sequences
    let worstTile = hand[0];
    let worstScore = Infinity;

    hand.forEach(tile => {
      let score = 0;
      const key = `${tile.type}-${tile.value || tile.dragon || tile.wind}`;
      const count = tileValues.get(key) || 0;
      
      // Penalty for breaking pairs
      if (count >= 2) score += 10;
      
      // Bonus for honor tiles (harder to form sequences)
      if (tile.type === 'dragon' || tile.type === 'wind') score -= 5;
      
      // Check if tile could form sequences (for suited tiles)
      if (tile.value && (tile.type === 'bamboo' || tile.type === 'character' || tile.type === 'dot')) {
        // Check for potential sequences
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
      players: gameState.players.map(p => 
        p.id === player.id ? { ...p, hand: newHand } : p
      )
    };

    // Check if any bot wants to claim the discarded tile
    const claimResult = checkBotClaims(newGameState, newDiscardPile[newDiscardPile.length - 1]);
    if (claimResult) {
      newGameState = claimResult;
    }

    setGameState(newGameState);
    setSelectedTile(null);
    soundManager.playTileSound('discard', 'bottom');
  };

  // Handle draw tile
  const handleDrawTile = () => {
    if (!gameState || gameState.currentPlayer !== 0 || gameState.wall.length === 0) {
      return;
    }

    const drawnTile = gameState.wall[0];
    const newWall = gameState.wall.slice(1);
    const player = gameState.players[0];
    const newHand = sortTiles([...player.hand, drawnTile]);

    // Check for win
    if (isWinningHand(newHand, player.exposedSets)) {
      const winScore = calculateWinScore(newHand, player.exposedSets, 'self-drawn', player.isDealer);
      
      setGameState({
        ...gameState,
        gamePhase: 'finished',
        winner: player.id,
        winType: 'self-drawn',
        winScore,
        wall: newWall,
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

  // Bot turn processing
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    if (currentPlayer.isBot) {
      const timer = setTimeout(() => {
        // Check for draw conditions
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
        
        // Move to next player if game is still playing
        if (newGameState.gamePhase === 'playing') {
          const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
          setGameState({
            ...newGameState,
            currentPlayer: nextPlayer
          });
        } else {
          setGameState(newGameState);
          if (newGameState.gamePhase === 'finished') {
            soundManager.playWinSound();
          }
        }

        // Play appropriate sound
        const position = currentPlayer.id === 'bot1' ? 'right' : 
                        currentPlayer.id === 'bot2' ? 'top' : 'left';
        soundManager.playTileSound('discard', position);
        soundManager.playTransitionSound('turn-change');
      }, 1500); // Bot thinking time

      return () => clearTimeout(timer);
    }
  }, [gameState, makeBotMove, soundManager, checkBotClaims]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const playerHand = gameState.players[0];
  const canDraw = gameState.currentPlayer === 0 && gameState.wall.length > 0;
  const canDiscard = gameState.currentPlayer === 0 && selectedTile !== null;

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
                  {currentPlayer.isBot ? `${currentPlayer.name} is thinking...` : "Your turn"}
                </span>
                {currentPlayer.isBot && <Clock className="w-4 h-4 text-emerald-300 animate-spin" />}
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
              </div>
              
              {/* Show back of tiles - removed the character */}
              <div className="flex flex-wrap justify-center gap-1 mb-4">
                {bot.hand.slice(0, Math.min(bot.hand.length, 8)).map((_, index) => (
                  <div
                    key={index}
                    className="w-8 h-12 bg-gradient-to-b from-emerald-600 to-emerald-700 rounded border border-emerald-500 flex items-center justify-center"
                  >
                    {/* Removed the 🀄 character to avoid confusion with red dragon */}
                  </div>
                ))}
                {bot.hand.length > 8 && (
                  <div className="w-8 h-12 bg-emerald-600/50 rounded border border-emerald-500 flex items-center justify-center">
                    <span className="text-emerald-200 text-xs">+{bot.hand.length - 8}</span>
                  </div>
                )}
              </div>

              {/* Exposed Sets */}
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

        {/* Player Hand - Now at the bottom */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-white font-medium text-lg mb-4 text-center">Your Hand</h3>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {playerHand.hand.map((tile) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={selectedTile === tile.id}
                onClick={() => handleTileClick(tile.id)}
                className="transition-all duration-200"
              />
            ))}
          </div>

          {/* Player Actions - Now positioned right below the hand */}
          {gameState.gamePhase === 'playing' && gameState.currentPlayer === 0 && (
            <div className="flex justify-center space-x-4 mb-6">
              <button
                onClick={handleDrawTile}
                disabled={!canDraw}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  canDraw
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Draw Tile ({gameState.wall.length} left)
              </button>
              <button
                onClick={handleDiscard}
                disabled={!canDiscard}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  canDiscard
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Discard Selected
              </button>
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
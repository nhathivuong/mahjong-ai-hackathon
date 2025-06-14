import React, { useState, useEffect, useCallback } from 'react';
import { Player, GameState, Tile, DiscardedTile } from '../types/mahjong';
import { createTileSet, shuffleTiles, isWinningHand, sortTiles } from '../utils/tileUtils';
import TileComponent from './TileComponent';
import DiscardHistory from './DiscardHistory';
import { Users, Bot, Trophy, RotateCcw } from 'lucide-react';

interface GameBoardProps {
  gameMode: 'bot' | 'local' | 'online';
}

const GameBoard: React.FC<GameBoardProps> = ({ gameMode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [drawnTile, setDrawnTile] = useState<Tile | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

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
  };

  const drawTile = useCallback((playerIndex: number) => {
    if (!gameState || gameState.wall.length === 0 || gameState.gamePhase === 'finished' || isProcessingTurn) return;

    const newWall = [...gameState.wall];
    const drawnTileFromWall = newWall.pop()!;
    
    const newPlayers = [...gameState.players];
    
    if (playerIndex === 0) {
      // For human player, set the drawn tile separately
      setDrawnTile(drawnTileFromWall);
    } else {
      // For bots, add directly to hand
      newPlayers[playerIndex].hand.push(drawnTileFromWall);
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
      setIsProcessingTurn(false);
    }
  }, [gameState, isProcessingTurn]);

  const discardTile = useCallback((playerIndex: number, tileIndex: number, isFromDrawn = false) => {
    if (!gameState || gameState.gamePhase === 'finished' || isProcessingTurn) return;

    setIsProcessingTurn(true);

    const newPlayers = [...gameState.players];
    let discardedTile: Tile;

    if (playerIndex === 0 && isFromDrawn && drawnTile) {
      // Discarding the drawn tile
      discardedTile = drawnTile;
      setDrawnTile(null);
    } else {
      // Discarding from hand
      discardedTile = newPlayers[playerIndex].hand.splice(tileIndex, 1)[0];
      
      // Sort player's hand after discarding if it's the human player
      if (playerIndex === 0) {
        newPlayers[playerIndex].hand = sortTiles(newPlayers[playerIndex].hand);
      }
    }
    
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

    // Move to next player's turn after a delay
    setTimeout(() => {
      setIsProcessingTurn(false);
      
      if (newGameState.gamePhase === 'playing' && nextPlayer !== 0) {
        // Start bot turn
        setTimeout(() => {
          botTurn(nextPlayer, newGameState);
        }, 500);
      }
    }, 800);
  }, [gameState, drawnTile, isProcessingTurn]);

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

        // Check for winning condition
        if (isWinningHand(newPlayers[botIndex].hand)) {
          setGameState(prev => prev ? {
            ...prev,
            gamePhase: 'finished',
            winner: newPlayers[botIndex].id
          } : null);
          setIsProcessingTurn(false);
          return;
        }

        // Bot discards a random tile after a delay
        setTimeout(() => {
          if (updatedGameState.gamePhase === 'playing' && newPlayers[botIndex].hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * newPlayers[botIndex].hand.length);
            const discardedTile = newPlayers[botIndex].hand.splice(randomIndex, 1)[0];
            
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
  }, [isProcessingTurn]);

  const handlePlayerTileClick = (tileIndex: number) => {
    if (gameState?.gamePhase === 'finished' || isProcessingTurn) return;
    setSelectedTileIndex(selectedTileIndex === tileIndex ? null : tileIndex);
  };

  const handleDrawnTileClick = () => {
    if (gameState?.gamePhase === 'finished' || !drawnTile || isProcessingTurn) return;
    setSelectedTileIndex(null);
  };

  const handlePlayerDiscard = () => {
    if (gameState?.currentPlayer !== 0 || gameState?.gamePhase !== 'playing' || isProcessingTurn) return;
    
    if (selectedTileIndex !== null) {
      discardTile(0, selectedTileIndex);
    }
  };

  const handleDiscardDrawnTile = () => {
    if (gameState?.currentPlayer !== 0 || gameState?.gamePhase !== 'playing' || !drawnTile || isProcessingTurn) return;
    
    discardTile(0, -1, true);
  };

  const handleDrawTile = () => {
    if (gameState?.currentPlayer !== 0 || gameState?.gamePhase !== 'playing' || drawnTile || isProcessingTurn) return;
    
    drawTile(0);
  };

  const handleKeepDrawnTile = () => {
    if (!drawnTile || gameState?.gamePhase === 'finished' || isProcessingTurn) return;

    // Add drawn tile to hand and sort
    const newPlayers = [...gameState!.players];
    newPlayers[0].hand.push(drawnTile);
    newPlayers[0].hand = sortTiles(newPlayers[0].hand);

    setGameState({
      ...gameState!,
      players: newPlayers
    });

    setDrawnTile(null);

    // Check for winning condition
    if (isWinningHand(newPlayers[0].hand)) {
      setGameState(prev => prev ? {
        ...prev,
        gamePhase: 'finished',
        winner: newPlayers[0].id
      } : null);
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

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
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
          </div>
          
          <div className="flex items-center space-x-2">
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
            </div>
          ))}
        </div>

        {/* Discard History */}
        <div className="mb-6">
          <DiscardHistory 
            discardPile={gameState.discardPile} 
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
                  disabled={isProcessingTurn}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Keep Tile
                </button>
                <button
                  onClick={handleDiscardDrawnTile}
                  disabled={isProcessingTurn}
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
              {gameState.currentPlayer === 0 && (
                <span className="ml-2 text-amber-300 text-sm">● Your Turn</span>
              )}
            </h3>
            <div className="flex space-x-2">
              {gameState.currentPlayer === 0 && gameState.gamePhase === 'playing' && !drawnTile && (
                <button
                  onClick={handleDrawTile}
                  disabled={gameState.wall.length === 0 || isProcessingTurn}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Draw Tile
                </button>
              )}
              {selectedTileIndex !== null && gameState.currentPlayer === 0 && gameState.gamePhase === 'playing' && (
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
          
          <div className="flex flex-wrap gap-2">
            {playerHand.map((tile, index) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={selectedTileIndex === index}
                onClick={() => handlePlayerTileClick(index)}
              />
            ))}
          </div>
          
          <div className="mt-4 text-emerald-200 text-sm">
            <p>Tiles in hand: {playerHand.length}</p>
            {selectedTileIndex !== null && (
              <p>Selected tile: {playerHand[selectedTileIndex].type} {playerHand[selectedTileIndex].value || playerHand[selectedTileIndex].dragon || playerHand[selectedTileIndex].wind}</p>
            )}
            {drawnTile && (
              <p className="text-blue-300 font-medium">You drew a tile! Choose to keep it or discard it.</p>
            )}
            {isProcessingTurn && (
              <p className="text-amber-300 font-medium">Processing turn...</p>
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
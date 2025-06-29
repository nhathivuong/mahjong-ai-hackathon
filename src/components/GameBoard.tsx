import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Tile, DiscardedTile } from '../types/mahjong';
import { 
  createTileSet, 
  shuffleTiles, 
  sortTiles, 
  canFormChow, 
  canFormPung, 
  canFormKong, 
  isWinningHand,
  analyzeWinningHand,
  calculateWinScore,
  checkDrawCondition,
  calculateDrawScores,
  isOneAwayFromWin
} from '../utils/tileUtils';
import { SoundManager } from '../utils/soundUtils';
import TileComponent from './TileComponent';
import BotActionIndicator, { BotActionType } from './BotActionIndicator';
import DiscardHistory from './DiscardHistory';
import { Settings, Volume2, VolumeX, Trophy, Users, Clock, Shuffle } from 'lucide-react';

interface GameBoardProps {
  gameMode: 'bot' | 'multiplayer';
}

interface ClaimOption {
  type: 'chow' | 'pung' | 'kong';
  tiles: Tile[];
  playerId: string;
}

interface BotAction {
  type: BotActionType;
  playerName: string;
  tiles?: Tile[];
}

const GameBoard: React.FC<GameBoardProps> = ({ gameMode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [claimOptions, setClaimOptions] = useState<ClaimOption[]>([]);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [botAction, setBotAction] = useState<BotAction | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winDetails, setWinDetails] = useState<any>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [drawDetails, setDrawDetails] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    averageScore: 0,
    bestScore: 0
  });

  const soundManager = SoundManager.getInstance();

  // Initialize sound settings
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setMasterVolume(masterVolume);
    soundManager.setSfxVolume(sfxVolume);
  }, [soundEnabled, masterVolume, sfxVolume]);

  const initializeGame = useCallback(() => {
    const tiles = shuffleTiles(createTileSet());
    
    const players: Player[] = [
      { id: 'player1', name: 'You', hand: [], exposedSets: [], score: 0, isDealer: true, isBot: false },
      { id: 'bot1', name: 'East Bot', hand: [], exposedSets: [], score: 0, isDealer: false, isBot: true },
      { id: 'bot2', name: 'North Bot', hand: [], exposedSets: [], score: 0, isDealer: false, isBot: true },
      { id: 'bot3', name: 'West Bot', hand: [], exposedSets: [], score: 0, isDealer: false, isBot: true }
    ];

    // Deal tiles - 13 to each player, 14 to dealer
    let tileIndex = 0;
    players.forEach((player, playerIndex) => {
      const tilesCount = player.isDealer ? 14 : 13;
      player.hand = sortTiles(tiles.slice(tileIndex, tileIndex + tilesCount));
      tileIndex += tilesCount;
    });

    const newGameState: GameState = {
      players,
      currentPlayer: 0, // Dealer starts
      wall: tiles.slice(tileIndex),
      discardPile: [],
      round: 1,
      gamePhase: 'playing',
      turnNumber: 1,
      lastActionWasClaim: false
    };

    setGameState(newGameState);
    setSelectedTile(null);
    setClaimOptions([]);
    setShowClaimDialog(false);
    setBotAction(null);
    setShowWinModal(false);
    setShowDrawModal(false);
    
    soundManager.playTransitionSound('game-start');
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // FIXED: Bot AI with proper player tracking
  const executeBotTurn = useCallback((state: GameState) => {
    const currentPlayer = state.players[state.currentPlayer];
    if (!currentPlayer.isBot) return;

    setTimeout(() => {
      setGameState(prevState => {
        if (!prevState || prevState.gamePhase !== 'playing') return prevState;
        
        const newState = { ...prevState };
        const player = newState.players[newState.currentPlayer];
        
        if (!player.isBot) return prevState;

        // FIXED: Ensure we're working with the correct bot player
        const botPlayer = { ...player };
        const botPlayerIndex = newState.currentPlayer;

        // Check if bot can win with current hand
        if (isWinningHand(botPlayer.hand, botPlayer.exposedSets)) {
          // Bot wins by self-draw
          const analysis = analyzeWinningHand(botPlayer.hand, botPlayer.exposedSets);
          const score = calculateWinScore(botPlayer.hand, botPlayer.exposedSets, 'self-drawn', botPlayer.isDealer);
          
          setBotAction({
            type: 'win',
            playerName: botPlayer.name,
            tiles: analysis.allTiles
          });

          setWinDetails({
            winner: botPlayer.name,
            winType: 'self-drawn',
            score,
            analysis,
            allPlayers: newState.players
          });

          newState.gamePhase = 'finished';
          newState.winner = botPlayer.id;
          newState.winType = 'self-drawn';
          newState.winScore = score;

          soundManager.playWinSound();
          
          setTimeout(() => {
            setShowWinModal(true);
            setBotAction(null);
          }, 2000);

          return newState;
        }

        // If bot just claimed, don't draw a tile
        if (!newState.lastActionWasClaim && newState.wall.length > 0) {
          // Draw a tile
          const drawnTile = newState.wall[0];
          botPlayer.hand = sortTiles([...botPlayer.hand, drawnTile]);
          newState.wall = newState.wall.slice(1);
          
          soundManager.playTileSound('draw', getPlayerPosition(botPlayer.id));

          // Check if bot can win with the drawn tile
          if (isWinningHand(botPlayer.hand, botPlayer.exposedSets)) {
            const analysis = analyzeWinningHand(botPlayer.hand, botPlayer.exposedSets);
            const score = calculateWinScore(botPlayer.hand, botPlayer.exposedSets, 'self-drawn', botPlayer.isDealer);
            
            setBotAction({
              type: 'win',
              playerName: botPlayer.name,
              tiles: analysis.allTiles
            });

            setWinDetails({
              winner: botPlayer.name,
              winType: 'self-drawn',
              score,
              analysis,
              allPlayers: newState.players
            });

            newState.gamePhase = 'finished';
            newState.winner = botPlayer.id;
            newState.winType = 'self-drawn';
            newState.winScore = score;

            soundManager.playWinSound();
            
            setTimeout(() => {
              setShowWinModal(true);
              setBotAction(null);
            }, 2000);

            return newState;
          }
        }

        // Reset the claim flag
        newState.lastActionWasClaim = false;

        // Bot decision making for discarding
        const winningTiles = isOneAwayFromWin(botPlayer.hand, botPlayer.exposedSets);
        let tileToDiscard: Tile;

        if (winningTiles.length > 0) {
          // Bot is close to winning, discard carefully
          const safeTiles = botPlayer.hand.filter(tile => 
            !winningTiles.some(wt => 
              wt.type === tile.type && 
              wt.value === tile.value && 
              wt.dragon === tile.dragon && 
              wt.wind === tile.wind
            )
          );
          tileToDiscard = safeTiles.length > 0 ? safeTiles[0] : botPlayer.hand[0];
        } else {
          // Random discard for now (could be improved with better AI)
          tileToDiscard = botPlayer.hand[Math.floor(Math.random() * botPlayer.hand.length)];
        }

        // Remove tile from bot's hand
        botPlayer.hand = botPlayer.hand.filter(tile => tile.id !== tileToDiscard.id);
        
        // Add to discard pile
        const discardedTile: DiscardedTile = {
          tile: tileToDiscard,
          playerId: botPlayer.id, // FIXED: Use correct bot player ID
          playerName: botPlayer.name, // FIXED: Use correct bot player name
          turnNumber: newState.turnNumber
        };
        
        newState.discardPile.push(discardedTile);
        newState.players[botPlayerIndex] = botPlayer; // FIXED: Update correct player index
        
        soundManager.playTileSound('discard', getPlayerPosition(botPlayer.id));

        // Check for claims by other players
        const claimingPlayers = checkForClaims(newState, discardedTile);
        
        if (claimingPlayers.length > 0) {
          // Handle claims (prioritize win > kong > pung > chow)
          const winClaim = claimingPlayers.find(claim => claim.type === 'win');
          if (winClaim) {
            handleBotWinClaim(newState, winClaim, discardedTile);
            return newState;
          }

          const kongClaim = claimingPlayers.find(claim => claim.type === 'kong');
          if (kongClaim) {
            handleBotClaim(newState, kongClaim, discardedTile);
            return newState;
          }

          const pungClaim = claimingPlayers.find(claim => claim.type === 'pung');
          if (pungClaim) {
            handleBotClaim(newState, pungClaim, discardedTile);
            return newState;
          }

          const chowClaim = claimingPlayers.find(claim => claim.type === 'chow');
          if (chowClaim) {
            handleBotClaim(newState, chowClaim, discardedTile);
            return newState;
          }
        }

        // Move to next player
        newState.currentPlayer = (newState.currentPlayer + 1) % 4;
        newState.turnNumber++;

        // Check for draw conditions
        const drawCondition = checkDrawCondition(newState.wall.length, newState.turnNumber);
        if (drawCondition) {
          const finalScores = calculateDrawScores(newState.players);
          setDrawDetails({
            reason: drawCondition,
            finalScores,
            players: newState.players
          });
          newState.gamePhase = 'draw';
          newState.drawReason = drawCondition;
          newState.finalScores = finalScores;
          
          setTimeout(() => setShowDrawModal(true), 1000);
        }

        soundManager.playTransitionSound('turn-change');
        return newState;
      });
    }, 1000);
  }, []);

  // FIXED: Handle bot claims with proper player tracking
  const handleBotClaim = (state: GameState, claim: any, discardedTile: DiscardedTile) => {
    const claimingPlayerIndex = state.players.findIndex(p => p.id === claim.playerId);
    if (claimingPlayerIndex === -1) return;

    const claimingPlayer = { ...state.players[claimingPlayerIndex] };
    
    // Remove the discarded tile from discard pile
    state.discardPile = state.discardPile.filter(d => d.tile.id !== discardedTile.tile.id);
    
    // Form the set
    let claimedSet: Tile[];
    if (claim.type === 'kong') {
      const matchingTiles = canFormKong(claimingPlayer.hand, discardedTile.tile);
      if (matchingTiles) {
        claimedSet = [...matchingTiles, discardedTile.tile];
        claimingPlayer.hand = claimingPlayer.hand.filter(tile => 
          !matchingTiles.some(mt => mt.id === tile.id)
        );
      } else return;
    } else if (claim.type === 'pung') {
      const matchingTiles = canFormPung(claimingPlayer.hand, discardedTile.tile);
      if (matchingTiles) {
        claimedSet = [...matchingTiles, discardedTile.tile];
        claimingPlayer.hand = claimingPlayer.hand.filter(tile => 
          !matchingTiles.some(mt => mt.id === tile.id)
        );
      } else return;
    } else if (claim.type === 'chow') {
      claimedSet = [...claim.tiles, discardedTile.tile];
      claimingPlayer.hand = claimingPlayer.hand.filter(tile => 
        !claim.tiles.some(ct => ct.id === tile.id)
      );
    } else return;

    // Add to exposed sets
    claimingPlayer.exposedSets.push(claimedSet);
    claimingPlayer.hand = sortTiles(claimingPlayer.hand);
    
    // Update state
    state.players[claimingPlayerIndex] = claimingPlayer;
    state.currentPlayer = claimingPlayerIndex; // FIXED: Set current player to the claiming player
    state.lastActionWasClaim = true; // FIXED: Set claim flag
    
    // Show bot action
    setBotAction({
      type: claim.type,
      playerName: claimingPlayer.name, // FIXED: Use claiming player's name
      tiles: claimedSet
    });

    soundManager.playTileSound('claim', getPlayerPosition(claimingPlayer.id));
    
    setTimeout(() => setBotAction(null), 1500);
  };

  // Handle bot win claims
  const handleBotWinClaim = (state: GameState, claim: any, discardedTile: DiscardedTile) => {
    const winningPlayerIndex = state.players.findIndex(p => p.id === claim.playerId);
    if (winningPlayerIndex === -1) return;

    const winningPlayer = state.players[winningPlayerIndex];
    const testHand = [...winningPlayer.hand, discardedTile.tile];
    
    if (isWinningHand(testHand, winningPlayer.exposedSets)) {
      const analysis = analyzeWinningHand(testHand, winningPlayer.exposedSets);
      const score = calculateWinScore(testHand, winningPlayer.exposedSets, 'claimed', winningPlayer.isDealer);
      
      setBotAction({
        type: 'win',
        playerName: winningPlayer.name,
        tiles: analysis.allTiles
      });

      setWinDetails({
        winner: winningPlayer.name,
        winType: 'claimed',
        score,
        analysis,
        allPlayers: state.players
      });

      state.gamePhase = 'finished';
      state.winner = winningPlayer.id;
      state.winType = 'claimed';
      state.winScore = score;

      soundManager.playWinSound();
      
      setTimeout(() => {
        setShowWinModal(true);
        setBotAction(null);
      }, 2000);
    }
  };

  // Check for possible claims by all players
  const checkForClaims = (state: GameState, discardedTile: DiscardedTile): any[] => {
    const claims: any[] = [];
    const discardingPlayerIndex = state.players.findIndex(p => p.id === discardedTile.playerId);
    
    state.players.forEach((player, index) => {
      if (index === discardingPlayerIndex || !player.isBot) return;
      
      // Check for win
      const testHand = [...player.hand, discardedTile.tile];
      if (isWinningHand(testHand, player.exposedSets)) {
        claims.push({ type: 'win', playerId: player.id, playerIndex: index });
        return; // Win takes priority
      }
      
      // Check for kong
      if (canFormKong(player.hand, discardedTile.tile)) {
        claims.push({ type: 'kong', playerId: player.id, playerIndex: index });
      }
      
      // Check for pung
      if (canFormPung(player.hand, discardedTile.tile)) {
        claims.push({ type: 'pung', playerId: player.id, playerIndex: index });
      }
      
      // Check for chow (only next player)
      if (index === (discardingPlayerIndex + 1) % 4) {
        const chowOptions = canFormChow(player.hand, discardedTile.tile);
        if (chowOptions.length > 0) {
          claims.push({ type: 'chow', playerId: player.id, playerIndex: index, tiles: chowOptions[0] });
        }
      }
    });
    
    return claims;
  };

  // Get player position for sound positioning
  const getPlayerPosition = (playerId: string): 'center' | 'left' | 'right' | 'top' | 'bottom' => {
    switch (playerId) {
      case 'player1': return 'bottom';
      case 'bot1': return 'right';
      case 'bot2': return 'top';
      case 'bot3': return 'left';
      default: return 'center';
    }
  };

  // Execute bot turns
  useEffect(() => {
    if (gameState && gameState.gamePhase === 'playing') {
      const currentPlayer = gameState.players[gameState.currentPlayer];
      if (currentPlayer.isBot) {
        executeBotTurn(gameState);
      }
    }
  }, [gameState, executeBotTurn]);

  // Handle player tile selection and discard
  const handleTileClick = (tile: Tile) => {
    if (!gameState || gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot) return;

    if (selectedTile?.id === tile.id) {
      // Deselect if clicking the same tile
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  };

  // Handle player discard
  const handleDiscard = () => {
    if (!gameState || !selectedTile || gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot) return;

    setGameState(prevState => {
      if (!prevState) return prevState;
      
      const newState = { ...prevState };
      const player = { ...newState.players[0] }; // Player is always index 0
      
      // Remove selected tile from hand
      player.hand = player.hand.filter(tile => tile.id !== selectedTile.id);
      
      // Add to discard pile
      const discardedTile: DiscardedTile = {
        tile: selectedTile,
        playerId: player.id,
        playerName: player.name,
        turnNumber: newState.turnNumber
      };
      
      newState.discardPile.push(discardedTile);
      newState.players[0] = player;
      
      soundManager.playTileSound('discard', 'bottom');

      // Check for bot claims
      const claimingPlayers = checkForClaims(newState, discardedTile);
      
      if (claimingPlayers.length > 0) {
        // Handle claims (prioritize win > kong > pung > chow)
        const winClaim = claimingPlayers.find(claim => claim.type === 'win');
        if (winClaim) {
          handleBotWinClaim(newState, winClaim, discardedTile);
          setSelectedTile(null);
          return newState;
        }

        const kongClaim = claimingPlayers.find(claim => claim.type === 'kong');
        if (kongClaim) {
          handleBotClaim(newState, kongClaim, discardedTile);
          setSelectedTile(null);
          return newState;
        }

        const pungClaim = claimingPlayers.find(claim => claim.type === 'pung');
        if (pungClaim) {
          handleBotClaim(newState, pungClaim, discardedTile);
          setSelectedTile(null);
          return newState;
        }

        const chowClaim = claimingPlayers.find(claim => claim.type === 'chow');
        if (chowClaim) {
          handleBotClaim(newState, chowClaim, discardedTile);
          setSelectedTile(null);
          return newState;
        }
      }

      // Move to next player
      newState.currentPlayer = (newState.currentPlayer + 1) % 4;
      newState.turnNumber++;
      newState.lastActionWasClaim = false;

      // Check for draw conditions
      const drawCondition = checkDrawCondition(newState.wall.length, newState.turnNumber);
      if (drawCondition) {
        const finalScores = calculateDrawScores(newState.players);
        setDrawDetails({
          reason: drawCondition,
          finalScores,
          players: newState.players
        });
        newState.gamePhase = 'draw';
        newState.drawReason = drawCondition;
        newState.finalScores = finalScores;
        
        setTimeout(() => setShowDrawModal(true), 1000);
      }

      setSelectedTile(null);
      soundManager.playTransitionSound('turn-change');
      return newState;
    });
  };

  // Handle player draw
  const handleDraw = () => {
    if (!gameState || gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot || gameState.wall.length === 0) return;

    // Don't draw if last action was a claim
    if (gameState.lastActionWasClaim) return;

    setGameState(prevState => {
      if (!prevState) return prevState;
      
      const newState = { ...prevState };
      const player = { ...newState.players[0] };
      
      // Draw tile
      const drawnTile = newState.wall[0];
      player.hand = sortTiles([...player.hand, drawnTile]);
      newState.wall = newState.wall.slice(1);
      newState.players[0] = player;
      
      soundManager.playTileSound('draw', 'bottom');

      // Check if player can win
      if (isWinningHand(player.hand, player.exposedSets)) {
        const analysis = analyzeWinningHand(player.hand, player.exposedSets);
        const score = calculateWinScore(player.hand, player.exposedSets, 'self-drawn', player.isDealer);
        
        setWinDetails({
          winner: player.name,
          winType: 'self-drawn',
          score,
          analysis,
          allPlayers: newState.players
        });

        newState.gamePhase = 'finished';
        newState.winner = player.id;
        newState.winType = 'self-drawn';
        newState.winScore = score;

        soundManager.playWinSound();
        setTimeout(() => setShowWinModal(true), 500);
      }

      return newState;
    });
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const humanPlayer = gameState.players[0];
  const isPlayerTurn = gameState.currentPlayer === 0 && !currentPlayer.isBot;
  const canDraw = isPlayerTurn && gameState.wall.length > 0 && !gameState.lastActionWasClaim;
  const canDiscard = isPlayerTurn && selectedTile !== null;

  return (
    <div className="min-h-screen p-4 relative">
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-40 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Game Stats */}
      <div className="fixed top-4 left-4 z-40 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>Round {gameState.round}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Turn {gameState.turnNumber}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Shuffle className="w-4 h-4" />
            <span>{gameState.wall.length} tiles</span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto">
        {/* Top Bot */}
        <div className="text-center mb-4">
          <div className="inline-block bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${gameState.currentPlayer === 2 ? 'bg-amber-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <h3 className="text-white font-medium">{gameState.players[2].name}</h3>
              <div className="text-emerald-200 text-sm">
                {gameState.players[2].hand.length} tiles
              </div>
            </div>
            {gameState.players[2].exposedSets.length > 0 && (
              <div className="flex justify-center space-x-1 mb-2">
                {gameState.players[2].exposedSets.map((set, setIndex) => (
                  <div key={setIndex} className="flex space-x-0.5">
                    {set.map((tile, tileIndex) => (
                      <TileComponent
                        key={`${setIndex}-${tileIndex}`}
                        tile={tile}
                        height="compact"
                        className="opacity-90"
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-center space-x-1">
              {gameState.players[2].hand.map((_, index) => (
                <div
                  key={index}
                  className="w-6 h-8 bg-emerald-700 border border-emerald-600 rounded-sm"
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Row */}
        <div className="flex justify-between items-center mb-4">
          {/* Left Bot */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${gameState.currentPlayer === 3 ? 'bg-amber-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <h3 className="text-white font-medium">{gameState.players[3].name}</h3>
              </div>
              <div className="text-emerald-200 text-sm">
                {gameState.players[3].hand.length} tiles
              </div>
              {gameState.players[3].exposedSets.length > 0 && (
                <div className="space-y-1">
                  {gameState.players[3].exposedSets.map((set, setIndex) => (
                    <div key={setIndex} className="flex space-x-0.5">
                      {set.map((tile, tileIndex) => (
                        <TileComponent
                          key={`${setIndex}-${tileIndex}`}
                          tile={tile}
                          height="compact"
                          className="opacity-90"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col space-y-1">
                {gameState.players[3].hand.map((_, index) => (
                  <div
                    key={index}
                    className="w-6 h-8 bg-emerald-700 border border-emerald-600 rounded-sm"
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Discard History */}
          <div className="flex-1 mx-6">
            <DiscardHistory 
              discardPile={gameState.discardPile} 
              players={gameState.players.map(p => ({ id: p.id, name: p.name }))}
            />
          </div>

          {/* Right Bot */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${gameState.currentPlayer === 1 ? 'bg-amber-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <h3 className="text-white font-medium">{gameState.players[1].name}</h3>
              </div>
              <div className="text-emerald-200 text-sm">
                {gameState.players[1].hand.length} tiles
              </div>
              {gameState.players[1].exposedSets.length > 0 && (
                <div className="space-y-1">
                  {gameState.players[1].exposedSets.map((set, setIndex) => (
                    <div key={setIndex} className="flex space-x-0.5">
                      {set.map((tile, tileIndex) => (
                        <TileComponent
                          key={`${setIndex}-${tileIndex}`}
                          tile={tile}
                          height="compact"
                          className="opacity-90"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col space-y-1">
                {gameState.players[1].hand.map((_, index) => (
                  <div
                    key={index}
                    className="w-6 h-8 bg-emerald-700 border border-emerald-600 rounded-sm"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Player Hand */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isPlayerTurn ? 'bg-amber-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <h3 className="text-white font-medium text-lg">{humanPlayer.name}</h3>
              <div className="text-emerald-200">
                {humanPlayer.hand.length} tiles
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDraw}
                disabled={!canDraw}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  canDraw
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Draw Tile
              </button>
              <button
                onClick={handleDiscard}
                disabled={!canDiscard}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  canDiscard
                    ? 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Discard
              </button>
            </div>
          </div>

          {/* Exposed Sets */}
          {humanPlayer.exposedSets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-emerald-200 text-sm mb-2">Exposed Sets:</h4>
              <div className="flex space-x-4">
                {humanPlayer.exposedSets.map((set, setIndex) => (
                  <div key={setIndex} className="flex space-x-1 bg-white/5 rounded-lg p-2">
                    {set.map((tile, tileIndex) => (
                      <TileComponent
                        key={`${setIndex}-${tileIndex}`}
                        tile={tile}
                        className="opacity-90"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hand Tiles */}
          <div className="flex flex-wrap gap-2 justify-center">
            {humanPlayer.hand.map((tile, index) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={selectedTile?.id === tile.id}
                onClick={() => handleTileClick(tile)}
                className="hover:scale-105 transition-transform duration-200"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bot Action Indicator */}
      {botAction && (
        <BotActionIndicator
          action={botAction.type}
          playerName={botAction.playerName}
          tiles={botAction.tiles}
          onComplete={() => setBotAction(null)}
        />
      )}

      {/* Win Modal */}
      {showWinModal && winDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Mahjong!</h2>
              <p className="text-emerald-200 text-lg">
                {winDetails.winner} wins with {winDetails.winType === 'self-drawn' ? 'self-drawn' : 'claimed discard'}!
              </p>
              <div className="mt-4 bg-white/10 rounded-lg p-4 inline-block">
                <p className="text-white font-medium">Score: {winDetails.score} points</p>
                <p className="text-emerald-200 text-sm">{winDetails.analysis.handType}</p>
              </div>
            </div>

            {/* Winning Hand Display */}
            <div className="mb-6">
              <h3 className="text-white font-medium mb-4 text-center">Winning Hand</h3>
              <div className="bg-emerald-800/20 rounded-xl p-4">
                {/* Sets */}
                {winDetails.analysis.sets.length > 0 && (
                  <div className="mb-4">
                    <p className="text-emerald-200 text-sm mb-2">Sets:</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {winDetails.analysis.sets.map((set: Tile[], setIndex: number) => (
                        <div key={setIndex} className="flex space-x-1 bg-white/10 rounded-lg p-2">
                          {set.map((tile: Tile, tileIndex: number) => (
                            <TileComponent
                              key={`${setIndex}-${tileIndex}`}
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

                {/* Pair */}
                {winDetails.analysis.pair.length > 0 && (
                  <div>
                    <p className="text-emerald-200 text-sm mb-2">Pair:</p>
                    <div className="flex justify-center">
                      <div className="flex space-x-1 bg-white/10 rounded-lg p-2">
                        {winDetails.analysis.pair.map((tile: Tile, tileIndex: number) => (
                          <TileComponent
                            key={tileIndex}
                            tile={tile}
                            height="compact"
                            className="opacity-90"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Final Scores */}
            <div className="mb-6">
              <h3 className="text-white font-medium mb-3">Final Scores</h3>
              <div className="space-y-2">
                {winDetails.allPlayers.map((player: Player, index: number) => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      player.id === gameState.winner
                        ? 'bg-amber-500/20 border border-amber-400'
                        : 'bg-white/5'
                    }`}
                  >
                    <span className="text-white font-medium">{player.name}</span>
                    <span className={`font-bold ${
                      player.id === gameState.winner ? 'text-amber-400' : 'text-emerald-200'
                    }`}>
                      {player.id === gameState.winner ? winDetails.score : 0} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={initializeGame}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 px-6 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 hover:scale-105"
              >
                New Game
              </button>
              <button
                onClick={() => setShowWinModal(false)}
                className="flex-1 bg-white/10 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Modal */}
      {showDrawModal && drawDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shuffle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Draw Game</h2>
              <p className="text-emerald-200">
                {drawDetails.reason === 'wall-exhausted' 
                  ? 'No more tiles in the wall' 
                  : 'Game took too long'}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-white font-medium mb-3">Final Scores</h3>
              <div className="space-y-2">
                {drawDetails.players.map((player: Player, index: number) => (
                  <div key={player.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white font-medium">{player.name}</span>
                    <span className="text-emerald-200 font-bold">
                      {drawDetails.finalScores[index]} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={initializeGame}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105"
              >
                New Game
              </button>
              <button
                onClick={() => setShowDrawModal(false)}
                className="flex-1 bg-white/10 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
            
            <div className="space-y-6">
              {/* Sound Settings */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-medium">Sound Effects</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      soundEnabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>
                
                {soundEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-emerald-200 text-sm mb-2">
                        Master Volume: {Math.round(masterVolume * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={masterVolume}
                        onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-emerald-200 text-sm mb-2">
                        SFX Volume: {Math.round(sfxVolume * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={sfxVolume}
                        onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Game Stats */}
              <div>
                <h3 className="text-white font-medium mb-3">Game Statistics</h3>
                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Games Played:</span>
                    <span className="text-white">{gameStats.gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Games Won:</span>
                    <span className="text-white">{gameStats.gamesWon}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Win Rate:</span>
                    <span className="text-white">
                      {gameStats.gamesPlayed > 0 ? Math.round((gameStats.gamesWon / gameStats.gamesPlayed) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Best Score:</span>
                    <span className="text-white">{gameStats.bestScore}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-white/10 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
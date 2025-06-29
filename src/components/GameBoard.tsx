import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Settings, Volume2, VolumeX, Trophy, Users, Clock, Shuffle, X } from 'lucide-react';

interface GameBoardProps {
  gameMode: 'bot' | 'multiplayer';
}

interface ClaimOption {
  type: 'chow' | 'pung' | 'kong' | 'win';
  tiles: Tile[];
  playerId: string;
  playerName: string;
  discardedTile: Tile;
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

  // Simple processing flag to prevent race conditions
  const isProcessing = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);
  const soundManager = SoundManager.getInstance();

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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

    // Deal tiles - 13 to each player first
    let tileIndex = 0;
    players.forEach((player) => {
      player.hand = sortTiles(tiles.slice(tileIndex, tileIndex + 13));
      tileIndex += 13;
    });

    // Give the dealer (player) the 14th tile
    const dealerIndex = players.findIndex(p => p.isDealer);
    players[dealerIndex].hand = sortTiles([...players[dealerIndex].hand, tiles[tileIndex]]);
    tileIndex += 1;

    const newGameState: GameState = {
      players,
      currentPlayer: dealerIndex, // Dealer starts
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
    
    // Reset processing flag
    isProcessing.current = false;
    
    soundManager.playTransitionSound('game-start');
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

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

  // FIXED: Separate bot claims from human claims
  const checkForBotClaims = (state: GameState, discardedTile: DiscardedTile): any[] => {
    const claims: any[] = [];
    const discardingPlayerIndex = state.players.findIndex(p => p.id === discardedTile.playerId);
    
    state.players.forEach((player, index) => {
      if (index === discardingPlayerIndex || !player.isBot) return; // Skip discarding player and human players
      
      // Check for win first (highest priority)
      const testHand = [...player.hand, discardedTile.tile];
      if (isWinningHand(testHand, player.exposedSets)) {
        claims.push({ type: 'win', playerId: player.id, playerIndex: index, priority: 4 });
        return; // Win takes absolute priority
      }
      
      // Check for kong (second priority)
      const kongTiles = canFormKong(player.hand, discardedTile.tile);
      if (kongTiles) {
        claims.push({ 
          type: 'kong', 
          playerId: player.id, 
          playerIndex: index, 
          tiles: kongTiles,
          priority: 3 
        });
      }
      
      // Check for pung (third priority)
      const pungTiles = canFormPung(player.hand, discardedTile.tile);
      if (pungTiles) {
        claims.push({ 
          type: 'pung', 
          playerId: player.id, 
          playerIndex: index, 
          tiles: pungTiles,
          priority: 2 
        });
      }
      
      // Check for chow (lowest priority, only next player)
      if (index === (discardingPlayerIndex + 1) % 4) {
        const chowOptions = canFormChow(player.hand, discardedTile.tile);
        if (chowOptions.length > 0) {
          claims.push({ 
            type: 'chow', 
            playerId: player.id, 
            playerIndex: index, 
            tiles: chowOptions[0],
            priority: 1 
          });
        }
      }
    });
    
    // Sort by priority (highest first)
    return claims.sort((a, b) => b.priority - a.priority);
  };

  // NEW: Check for human player claims
  const checkForHumanClaims = (state: GameState, discardedTile: DiscardedTile): ClaimOption[] => {
    const claims: ClaimOption[] = [];
    const discardingPlayerIndex = state.players.findIndex(p => p.id === discardedTile.playerId);
    const humanPlayer = state.players[0]; // Assuming human is always player 0
    
    // Don't allow claiming own discard
    if (discardingPlayerIndex === 0) return claims;
    
    // Check for win first (highest priority)
    const testHand = [...humanPlayer.hand, discardedTile.tile];
    if (isWinningHand(testHand, humanPlayer.exposedSets)) {
      claims.push({
        type: 'win',
        tiles: [discardedTile.tile],
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        discardedTile: discardedTile.tile
      });
    }
    
    // Check for kong
    const kongTiles = canFormKong(humanPlayer.hand, discardedTile.tile);
    if (kongTiles) {
      claims.push({
        type: 'kong',
        tiles: kongTiles,
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        discardedTile: discardedTile.tile
      });
    }
    
    // Check for pung
    const pungTiles = canFormPung(humanPlayer.hand, discardedTile.tile);
    if (pungTiles) {
      claims.push({
        type: 'pung',
        tiles: pungTiles,
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        discardedTile: discardedTile.tile
      });
    }
    
    // Check for chow (only if human is next player)
    if (0 === (discardingPlayerIndex + 1) % 4) {
      const chowOptions = canFormChow(humanPlayer.hand, discardedTile.tile);
      chowOptions.forEach(chowTiles => {
        claims.push({
          type: 'chow',
          tiles: chowTiles,
          playerId: humanPlayer.id,
          playerName: humanPlayer.name,
          discardedTile: discardedTile.tile
        });
      });
    }
    
    return claims;
  };

  // Handle bot claims with proper state management
  const handleBotClaim = (state: GameState, claim: any, discardedTile: DiscardedTile) => {
    const claimingPlayerIndex = claim.playerIndex;
    const claimingPlayer = { ...state.players[claimingPlayerIndex] };
    
    // Remove the discarded tile from discard pile
    state.discardPile = state.discardPile.filter(d => d.tile.id !== discardedTile.tile.id);
    
    // Form the set based on claim type
    let claimedSet: Tile[];
    
    if (claim.type === 'kong') {
      // Kong: 3 matching tiles from hand + 1 discarded tile = 4 tiles total
      claimedSet = [...claim.tiles, discardedTile.tile];
      claimingPlayer.hand = claimingPlayer.hand.filter(tile => 
        !claim.tiles.some((ct: Tile) => ct.id === tile.id)
      );
    } else if (claim.type === 'pung') {
      // Pung: 2 matching tiles from hand + 1 discarded tile = 3 tiles total
      claimedSet = [...claim.tiles, discardedTile.tile];
      claimingPlayer.hand = claimingPlayer.hand.filter(tile => 
        !claim.tiles.some((ct: Tile) => ct.id === tile.id)
      );
    } else if (claim.type === 'chow') {
      // Chow: 2 sequence tiles from hand + 1 discarded tile = 3 tiles total
      claimedSet = [...claim.tiles, discardedTile.tile];
      claimingPlayer.hand = claimingPlayer.hand.filter(tile => 
        !claim.tiles.some((ct: Tile) => ct.id === tile.id)
      );
    } else {
      return; // Invalid claim type
    }

    // Add to exposed sets and sort hand
    claimingPlayer.exposedSets.push(claimedSet);
    claimingPlayer.hand = sortTiles(claimingPlayer.hand);
    
    // Update state
    state.players[claimingPlayerIndex] = claimingPlayer;
    state.currentPlayer = claimingPlayerIndex;
    state.lastActionWasClaim = true;
    
    // Show bot action indicator
    setBotAction({
      type: claim.type,
      playerName: claimingPlayer.name,
      tiles: claimedSet
    });

    soundManager.playTileSound('claim', getPlayerPosition(claimingPlayer.id));
    
    // Clear bot action after delay
    setTimeout(() => {
      setBotAction(null);
    }, 1500);
  };

  // Handle bot win claims
  const handleBotWinClaim = (state: GameState, claim: any, discardedTile: DiscardedTile) => {
    const winningPlayer = state.players[claim.playerIndex];
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

  // NEW: Handle human claim selection
  const handleHumanClaim = (claimOption: ClaimOption) => {
    if (!gameState) return;

    setGameState(prevState => {
      if (!prevState) return prevState;

      const newState = { ...prevState };
      const humanPlayer = { ...newState.players[0] };
      
      // Handle win claim
      if (claimOption.type === 'win') {
        const testHand = [...humanPlayer.hand, claimOption.discardedTile];
        const analysis = analyzeWinningHand(testHand, humanPlayer.exposedSets);
        const score = calculateWinScore(testHand, humanPlayer.exposedSets, 'claimed', humanPlayer.isDealer);
        
        setWinDetails({
          winner: humanPlayer.name,
          winType: 'claimed',
          score,
          analysis,
          allPlayers: newState.players
        });

        newState.gamePhase = 'finished';
        newState.winner = humanPlayer.id;
        newState.winType = 'claimed';
        newState.winScore = score;

        soundManager.playWinSound();
        setTimeout(() => setShowWinModal(true), 500);
        
        return newState;
      }

      // Handle other claims (kong, pung, chow)
      // Remove the discarded tile from discard pile
      newState.discardPile = newState.discardPile.filter(d => d.tile.id !== claimOption.discardedTile.id);
      
      // Form the set
      const claimedSet = [...claimOption.tiles, claimOption.discardedTile];
      
      // Remove tiles from hand
      humanPlayer.hand = humanPlayer.hand.filter(tile => 
        !claimOption.tiles.some(ct => ct.id === tile.id)
      );
      
      // Add to exposed sets
      humanPlayer.exposedSets.push(claimedSet);
      humanPlayer.hand = sortTiles(humanPlayer.hand);
      
      // Update state
      newState.players[0] = humanPlayer;
      newState.currentPlayer = 0; // Human player's turn to discard
      newState.lastActionWasClaim = true;
      
      soundManager.playTileSound('claim', 'bottom');
      
      return newState;
    });

    // Close claim dialog
    setShowClaimDialog(false);
    setClaimOptions([]);
  };

  // NEW: Handle declining claims
  const handleDeclineClaim = () => {
    setShowClaimDialog(false);
    setClaimOptions([]);
    
    // Continue with normal game flow - move to next player
    if (gameState) {
      setGameState(prevState => {
        if (!prevState) return prevState;
        
        const newState = { ...prevState };
        newState.currentPlayer = (newState.currentPlayer + 1) % 4;
        newState.turnNumber++;
        
        soundManager.playTransitionSound('turn-change');
        return newState;
      });
    }
  };

  // Execute bot turn with proper async handling
  const executeBotTurn = useCallback(async () => {
    if (isProcessing.current) return;

    const currentState = gameStateRef.current;
    if (!currentState || currentState.gamePhase !== 'playing') return;

    const currentPlayer = currentState.players[currentState.currentPlayer];
    if (!currentPlayer.isBot) return;

    isProcessing.current = true;
    console.log(`🤖 Bot ${currentPlayer.name} starting turn`);

    // Add delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    setGameState(prevState => {
      if (!prevState || 
          prevState.gamePhase !== 'playing' || 
          !prevState.players[prevState.currentPlayer].isBot) {
        isProcessing.current = false;
        return prevState;
      }

      const newState = { ...prevState };
      const botPlayer = { ...newState.players[newState.currentPlayer] };
      const botPlayerIndex = newState.currentPlayer;

      console.log(`🤖 Bot ${botPlayer.name} hand size: ${botPlayer.hand.length}, lastActionWasClaim: ${newState.lastActionWasClaim}`);

      // FIXED: Proper turn flow logic
      if (newState.lastActionWasClaim) {
        console.log(`🤖 Bot ${botPlayer.name} must discard after claim`);
      } else if (botPlayer.hand.length === 13) {
        // Normal turn: draw first, then discard
        if (newState.wall.length === 0) {
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
            
            setTimeout(() => {
              setShowDrawModal(true);
              isProcessing.current = false;
            }, 1000);
            
            return newState;
          }
        }

        // Draw a tile
        const drawnTile = newState.wall[0];
        botPlayer.hand = sortTiles([...botPlayer.hand, drawnTile]);
        newState.wall = newState.wall.slice(1);
        
        console.log(`🤖 Bot ${botPlayer.name} drew tile, hand size now: ${botPlayer.hand.length}`);
        soundManager.playTileSound('draw', getPlayerPosition(botPlayer.id));

        // Check win after drawing
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
            isProcessing.current = false;
          }, 2000);

          return newState;
        }
      } else if (botPlayer.hand.length !== 14 && botPlayer.hand.length !== 10 && botPlayer.hand.length !== 11) {
        // Invalid hand size
        console.error(`❌ Bot ${botPlayer.name} has invalid hand size: ${botPlayer.hand.length}`);
        isProcessing.current = false;
        return prevState;
      }

      // Now bot must discard
      console.log(`🤖 Bot ${botPlayer.name} choosing tile to discard from ${botPlayer.hand.length} tiles`);

      // Bot AI: Choose tile to discard
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
        // Random discard
        tileToDiscard = botPlayer.hand[Math.floor(Math.random() * botPlayer.hand.length)];
      }

      // Remove tile from bot's hand
      botPlayer.hand = botPlayer.hand.filter(tile => tile.id !== tileToDiscard.id);
      
      console.log(`🤖 Bot ${botPlayer.name} discarded tile, hand size now: ${botPlayer.hand.length}`);

      // Create discard entry
      const discardedTile: DiscardedTile = {
        tile: tileToDiscard,
        playerId: botPlayer.id,
        playerName: botPlayer.name,
        turnNumber: newState.turnNumber
      };
      
      // Add to discard pile and update player
      newState.discardPile = [...newState.discardPile, discardedTile];
      newState.players[botPlayerIndex] = botPlayer;
      
      // Reset claim flag after processing
      newState.lastActionWasClaim = false;
      
      soundManager.playTileSound('discard', getPlayerPosition(botPlayer.id));

      // FIXED: Check for bot claims first, then human claims
      const botClaims = checkForBotClaims(newState, discardedTile);
      
      if (botClaims.length > 0) {
        // Handle the highest priority bot claim
        const topClaim = botClaims[0];
        
        if (topClaim.type === 'win') {
          handleBotWinClaim(newState, topClaim, discardedTile);
          isProcessing.current = false;
          return newState;
        } else {
          handleBotClaim(newState, topClaim, discardedTile);
          isProcessing.current = false;
          return newState;
        }
      }

      // Check for human claims
      const humanClaims = checkForHumanClaims(newState, discardedTile);
      if (humanClaims.length > 0) {
        setClaimOptions(humanClaims);
        setShowClaimDialog(true);
        isProcessing.current = false;
        return newState;
      }

      // Move to next player and increment turn
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
        
        setTimeout(() => {
          setShowDrawModal(true);
          isProcessing.current = false;
        }, 1000);
      } else {
        isProcessing.current = false;
      }

      soundManager.playTransitionSound('turn-change');
      return newState;
    });
  }, []);

  // Trigger bot turns
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing' || isProcessing.current || showClaimDialog) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot) {
      executeBotTurn();
    }
  }, [gameState?.currentPlayer, gameState?.gamePhase, showClaimDialog, executeBotTurn]);

  // Handle player tile selection and discard
  const handleTileClick = (tile: Tile) => {
    if (!gameState || gameState.gamePhase !== 'playing' || isProcessing.current || showClaimDialog) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot) return;

    if (selectedTile?.id === tile.id) {
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  };

  // Handle player discard
  const handleDiscard = () => {
    if (!gameState || !selectedTile || gameState.gamePhase !== 'playing' || isProcessing.current || showClaimDialog) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot) return;

    // FIXED: Proper discard validation
    const validDiscardSizes = [10, 11, 14];
    if (!validDiscardSizes.includes(currentPlayer.hand.length)) {
      console.log(`❌ Player cannot discard with ${currentPlayer.hand.length} tiles`);
      return;
    }

    isProcessing.current = true;

    setGameState(prevState => {
      if (!prevState) {
        isProcessing.current = false;
        return prevState;
      }
      
      const newState = { ...prevState };
      const player = { ...newState.players[0] };
      
      // Remove selected tile from hand
      player.hand = player.hand.filter(tile => tile.id !== selectedTile.id);
      
      console.log(`👤 Player discarded tile, hand size now: ${player.hand.length}`);

      // Create discard entry
      const discardedTile: DiscardedTile = {
        tile: selectedTile,
        playerId: player.id,
        playerName: player.name,
        turnNumber: newState.turnNumber
      };
      
      // Add to discard pile and update player
      newState.discardPile = [...newState.discardPile, discardedTile];
      newState.players[0] = player;
      
      // Reset claim flag
      newState.lastActionWasClaim = false;
      
      soundManager.playTileSound('discard', 'bottom');

      // FIXED: Only check for bot claims, not human claims on player discard
      const botClaims = checkForBotClaims(newState, discardedTile);
      
      if (botClaims.length > 0) {
        const topClaim = botClaims[0];
        
        if (topClaim.type === 'win') {
          handleBotWinClaim(newState, topClaim, discardedTile);
          setSelectedTile(null);
          isProcessing.current = false;
          return newState;
        } else {
          handleBotClaim(newState, topClaim, discardedTile);
          setSelectedTile(null);
          isProcessing.current = false;
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
        
        setTimeout(() => {
          setShowDrawModal(true);
          isProcessing.current = false;
        }, 1000);
      } else {
        isProcessing.current = false;
      }

      setSelectedTile(null);
      soundManager.playTransitionSound('turn-change');
      return newState;
    });
  };

  // Handle player draw
  const handleDraw = () => {
    if (!gameState || gameState.gamePhase !== 'playing' || isProcessing.current || showClaimDialog) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isBot || gameState.wall.length === 0) return;
    
    // FIXED: Player can only draw if they have exactly 13 tiles and didn't just claim
    if (currentPlayer.hand.length !== 13 || gameState.lastActionWasClaim) return;

    isProcessing.current = true;

    setGameState(prevState => {
      if (!prevState) {
        isProcessing.current = false;
        return prevState;
      }
      
      const newState = { ...prevState };
      const player = { ...newState.players[0] };
      
      // Draw tile
      const drawnTile = newState.wall[0];
      player.hand = sortTiles([...player.hand, drawnTile]);
      newState.wall = newState.wall.slice(1);
      newState.players[0] = player;
      
      console.log(`👤 Player drew tile, hand size now: ${player.hand.length}`);
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
        setTimeout(() => {
          setShowWinModal(true);
          isProcessing.current = false;
        }, 500);
      } else {
        isProcessing.current = false;
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
  
  // FIXED: Proper draw/discard conditions
  const canDraw = isPlayerTurn && gameState.wall.length > 0 && !gameState.lastActionWasClaim && humanPlayer.hand.length === 13 && !isProcessing.current && !showClaimDialog;
  const canDiscard = isPlayerTurn && selectedTile !== null && [10, 11, 14].includes(humanPlayer.hand.length) && !isProcessing.current && !showClaimDialog;

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

      {/* Processing Indicator */}
      {isProcessing.current && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {/* Claim Dialog */}
      {showClaimDialog && claimOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Claim Available!</h3>
              <button
                onClick={handleDeclineClaim}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-emerald-200 mb-4">
              You can claim the discarded tile to form:
            </p>
            
            <div className="space-y-3 mb-6">
              {claimOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleHumanClaim(option)}
                  className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-white font-medium capitalize mb-1">
                        {option.type === 'win' ? 'Mahjong!' : option.type}
                      </div>
                      <div className="flex items-center space-x-1">
                        {option.tiles.map((tile, tileIndex) => (
                          <TileComponent
                            key={tileIndex}
                            tile={tile}
                            height="compact"
                            className="opacity-90"
                          />
                        ))}
                        <span className="text-emerald-200 mx-2">+</span>
                        <TileComponent
                          tile={option.discardedTile}
                          height="compact"
                          className="opacity-90 border-2 border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="text-emerald-200 text-sm">
                      {option.type === 'win' ? '🏆' : '→'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDeclineClaim}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div key={setIndex} className="flex space-x-0.5 bg-white/10 rounded p-1">
                    {set.map((tile, tileIndex) => (
                      <TileComponent
                        key={`${setIndex}-${tileIndex}`}
                        tile={tile}
                        height="compact"
                        className="opacity-90"
                      />
                    ))}
                    {/* Kong indicator */}
                    {set.length === 4 && (
                      <div className="text-xs text-amber-400 font-bold self-center ml-1">K</div>
                    )}
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
                    <div key={setIndex} className="flex space-x-0.5 bg-white/10 rounded p-1">
                      {set.map((tile, tileIndex) => (
                        <TileComponent
                          key={`${setIndex}-${tileIndex}`}
                          tile={tile}
                          height="compact"
                          className="opacity-90"
                        />
                      ))}
                      {/* Kong indicator */}
                      {set.length === 4 && (
                        <div className="text-xs text-amber-400 font-bold self-center ml-1">K</div>
                      )}
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
                    <div key={setIndex} className="flex space-x-0.5 bg-white/10 rounded p-1">
                      {set.map((tile, tileIndex) => (
                        <TileComponent
                          key={`${setIndex}-${tileIndex}`}
                          tile={tile}
                          height="compact"
                          className="opacity-90"
                        />
                      ))}
                      {/* Kong indicator */}
                      {set.length === 4 && (
                        <div className="text-xs text-amber-400 font-bold self-center ml-1">K</div>
                      )}
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
                  <div key={setIndex} className="flex items-center space-x-1 bg-white/5 rounded-lg p-2">
                    {set.map((tile, tileIndex) => (
                      <TileComponent
                        key={`${setIndex}-${tileIndex}`}
                        tile={tile}
                        className="opacity-90"
                      />
                    ))}
                    {/* Kong indicator */}
                    {set.length === 4 && (
                      <div className="text-amber-400 font-bold text-sm ml-2">KONG</div>
                    )}
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
                        <div key={setIndex} className="flex items-center space-x-1 bg-white/10 rounded-lg p-2">
                          {set.map((tile: Tile, tileIndex: number) => (
                            <TileComponent
                              key={`${setIndex}-${tileIndex}`}
                              tile={tile}
                              height="compact"
                              className="opacity-90"
                            />
                          ))}
                          {/* Kong indicator in win display */}
                          {set.length === 4 && (
                            <div className="text-amber-400 font-bold text-xs ml-1">K</div>
                          )}
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
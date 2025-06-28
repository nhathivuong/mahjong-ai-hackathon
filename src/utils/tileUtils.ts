import { Tile, TileType, DragonType, WindType } from '../types/mahjong';

export const createTileSet = (): Tile[] => {
  const tiles: Tile[] = [];

  // Bamboo tiles (1-9), 4 of each
  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `bamboo-${value}-${copy}`,
        type: 'bamboo',
        value,
        unicode: getBambooUnicode(value)
      });
    }
  }

  // Character tiles (1-9), 4 of each
  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `character-${value}-${copy}`,
        type: 'character',
        value,
        unicode: getCharacterUnicode(value)
      });
    }
  }

  // Dot tiles (1-9), 4 of each
  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `dot-${value}-${copy}`,
        type: 'dot',
        value,
        unicode: getDotUnicode(value)
      });
    }
  }

  // Dragon tiles, 4 of each
  const dragons: DragonType[] = ['red', 'green', 'white'];
  dragons.forEach(dragon => {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `dragon-${dragon}-${copy}`,
        type: 'dragon',
        dragon,
        unicode: getDragonUnicode(dragon)
      });
    }
  });

  // Wind tiles, 4 of each
  const winds: WindType[] = ['east', 'south', 'west', 'north'];
  winds.forEach(wind => {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `wind-${wind}-${copy}`,
        type: 'wind',
        wind,
        unicode: getWindUnicode(wind)
      });
    }
  });

  return tiles;
};

export const shuffleTiles = (tiles: Tile[]): Tile[] => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const sortTiles = (tiles: Tile[]): Tile[] => {
  return [...tiles].sort((a, b) => {
    // First sort by type
    const typeOrder = { 'character': 0, 'bamboo': 1, 'dot': 2, 'wind': 3, 'dragon': 4 };
    const typeComparison = typeOrder[a.type] - typeOrder[b.type];
    if (typeComparison !== 0) return typeComparison;

    // Then sort by value/wind/dragon
    if (a.value && b.value) {
      return a.value - b.value;
    }
    
    if (a.wind && b.wind) {
      const windOrder = { 'east': 0, 'south': 1, 'west': 2, 'north': 3 };
      return windOrder[a.wind] - windOrder[b.wind];
    }
    
    if (a.dragon && b.dragon) {
      const dragonOrder = { 'red': 0, 'green': 1, 'white': 2 };
      return dragonOrder[a.dragon] - dragonOrder[b.dragon];
    }
    
    return 0;
  });
};

export const getBambooUnicode = (value: number): string => {
  const bambooUnicodes = ['🎋', '🎍', '🎋', '🎍', '🎋', '🎍', '🎋', '🎍', '🎋'];
  return `${value}`;
};

export const getCharacterUnicode = (value: number): string => {
  const characterUnicodes = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return characterUnicodes[value - 1];
};

export const getDotUnicode = (value: number): string => {
  return '●'.repeat(Math.min(value, 9));
};

export const getDragonUnicode = (dragon: DragonType): string => {
  const dragonUnicodes = {
    red: '中',
    green: '發',
    white: '白'
  };
  return dragonUnicodes[dragon];
};

export const getWindUnicode = (wind: WindType): string => {
  const windUnicodes = {
    east: '東',
    south: '南',
    west: '西',
    north: '北'
  };
  return windUnicodes[wind];
};

export const canFormSet = (tiles: Tile[]): boolean => {
  if (tiles.length !== 3) return false;
  
  // Check for triplet (3 identical tiles)
  if (tiles.every(tile => 
    tile.type === tiles[0].type && 
    tile.value === tiles[0].value &&
    tile.dragon === tiles[0].dragon &&
    tile.wind === tiles[0].wind
  )) {
    return true;
  }

  // Check for sequence (3 consecutive tiles of same type)
  if (tiles[0].type === 'bamboo' || tiles[0].type === 'character' || tiles[0].type === 'dot') {
    const values = tiles.map(tile => tile.value!).sort((a, b) => a - b);
    return values[1] === values[0] + 1 && values[2] === values[1] + 1;
  }

  return false;
};

export const canFormChow = (hand: Tile[], discardedTile: Tile): Tile[][] => {
  if (discardedTile.type !== 'bamboo' && discardedTile.type !== 'character' && discardedTile.type !== 'dot') {
    return [];
  }

  const possibleChows: Tile[][] = [];
  const value = discardedTile.value!;
  const type = discardedTile.type;

  // Find tiles of the same type in hand
  const sameSuitTiles = hand.filter(tile => tile.type === type && tile.value);

  // Check for sequences where discarded tile can complete them
  for (let i = 0; i < sameSuitTiles.length; i++) {
    for (let j = i + 1; j < sameSuitTiles.length; j++) {
      const tile1 = sameSuitTiles[i];
      const tile2 = sameSuitTiles[j];
      const values = [tile1.value!, tile2.value!, value].sort((a, b) => a - b);
      
      // Check if they form a sequence
      if (values[1] === values[0] + 1 && values[2] === values[1] + 1) {
        possibleChows.push([tile1, tile2]);
      }
    }
  }

  return possibleChows;
};

export const canFormPung = (hand: Tile[], discardedTile: Tile): Tile[] | null => {
  const matchingTiles = hand.filter(tile => 
    tile.type === discardedTile.type &&
    tile.value === discardedTile.value &&
    tile.dragon === discardedTile.dragon &&
    tile.wind === discardedTile.wind
  );

  return matchingTiles.length >= 2 ? matchingTiles.slice(0, 2) : null;
};

export const canFormKong = (hand: Tile[], discardedTile: Tile): Tile[] | null => {
  const matchingTiles = hand.filter(tile => 
    tile.type === discardedTile.type &&
    tile.value === discardedTile.value &&
    tile.dragon === discardedTile.dragon &&
    tile.wind === discardedTile.wind
  );

  return matchingTiles.length >= 3 ? matchingTiles.slice(0, 3) : null;
};

// FIXED: Enhanced winning hand detection with proper kong handling
export const isWinningHand = (hand: Tile[], exposedSets: Tile[][] = []): boolean => {
  // Calculate total tiles correctly - kongs have 4 tiles but count as 1 set
  const handTileCount = hand.length;
  const exposedTileCount = exposedSets.reduce((total, set) => total + set.length, 0);
  const totalTiles = handTileCount + exposedTileCount;
  
  // Must have exactly 14 tiles for a winning hand
  if (totalTiles !== 14) return false;
  
  // Count exposed sets properly - each kong (4 tiles) counts as 1 set
  const exposedSetCount = exposedSets.length;
  const remainingSetsNeeded = 4 - exposedSetCount;
  
  // Special case: If we have 4 exposed sets, hand must be exactly a pair (2 tiles)
  if (exposedSetCount === 4) {
    if (handTileCount !== 2) return false;
    // Check if the 2 tiles in hand form a pair
    return hand[0].type === hand[1].type &&
           hand[0].value === hand[1].value &&
           hand[0].dragon === hand[1].dragon &&
           hand[0].wind === hand[1].wind;
  }
  
  // For hands with fewer exposed sets, check standard patterns
  const tileMap = new Map<string, Tile[]>();
  
  hand.forEach(tile => {
    const key = getTileKey(tile);
    if (!tileMap.has(key)) {
      tileMap.set(key, []);
    }
    tileMap.get(key)!.push(tile);
  });

  const groups = Array.from(tileMap.values());
  
  // Check for special winning patterns (only if no exposed sets)
  if (exposedSetCount === 0) {
    if (checkSevenPairs(groups)) return true;
    if (checkThirteenOrphans(groups)) return true;
  }
  
  // Check standard winning pattern: remaining sets + 1 pair from hand
  return checkStandardWinningPattern(groups, remainingSetsNeeded);
};

// Helper function to create a unique key for each tile type
const getTileKey = (tile: Tile): string => {
  if (tile.value) {
    return `${tile.type}-${tile.value}`;
  } else if (tile.dragon) {
    return `dragon-${tile.dragon}`;
  } else if (tile.wind) {
    return `wind-${tile.wind}`;
  }
  return `${tile.type}`;
};

// Check for Seven Pairs special hand
const checkSevenPairs = (groups: Tile[][]): boolean => {
  if (groups.length !== 7) return false;
  return groups.every(group => group.length === 2);
};

// Check for Thirteen Orphans special hand
const checkThirteenOrphans = (groups: Tile[][]): boolean => {
  const requiredTiles = [
    'character-1', 'character-9',
    'bamboo-1', 'bamboo-9',
    'dot-1', 'dot-9',
    'dragon-red', 'dragon-green', 'dragon-white',
    'wind-east', 'wind-south', 'wind-west', 'wind-north'
  ];
  
  const tileKeys = groups.map(group => getTileKey(group[0]));
  const uniqueKeys = new Set(tileKeys);
  
  // Must have all 13 terminal/honor tiles
  if (uniqueKeys.size !== 13) return false;
  
  // Check if all required tiles are present
  const hasAllRequired = requiredTiles.every(required => uniqueKeys.has(required));
  if (!hasAllRequired) return false;
  
  // One tile should appear twice (the pair), others once
  const counts = Array.from(groups.map(group => group.length)).sort();
  return counts.join(',') === '1,1,1,1,1,1,1,1,1,1,1,1,2';
};

// FIXED: Check standard winning pattern with proper kong handling
const checkStandardWinningPattern = (groups: Tile[][], remainingSetsNeeded: number): boolean => {
  // Find pairs (exactly one needed)
  const pairs = groups.filter(group => group.length === 2);
  if (pairs.length !== 1) return false;
  
  // Remove the pair from consideration
  const nonPairGroups = groups.filter(group => group.length !== 2);
  
  // Check if remaining tiles can form the required number of sets
  return canFormSets(nonPairGroups, remainingSetsNeeded);
};

// FIXED: Recursively check if tiles can form sets, with proper kong handling
const canFormSets = (groups: Tile[][], setsNeeded: number): boolean => {
  if (setsNeeded === 0) {
    return groups.every(group => group.length === 0);
  }
  
  // Try to form a kong first (4 identical tiles = 1 set)
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length >= 4) {
      const newGroups = [...groups];
      newGroups[i] = newGroups[i].slice(4); // Remove 4 tiles for kong
      if (canFormSets(newGroups.filter(g => g.length > 0), setsNeeded - 1)) {
        return true;
      }
    }
  }
  
  // Try to form a triplet (3 identical tiles = 1 set)
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length >= 3) {
      const newGroups = [...groups];
      newGroups[i] = newGroups[i].slice(3); // Remove 3 tiles for triplet
      if (canFormSets(newGroups.filter(g => g.length > 0), setsNeeded - 1)) {
        return true;
      }
    }
  }
  
  // Try to form sequences (only for suited tiles)
  const suitedGroups = groups.filter(group => 
    group.length > 0 && (group[0].type === 'character' || group[0].type === 'bamboo' || group[0].type === 'dot')
  );
  
  for (let i = 0; i < suitedGroups.length; i++) {
    const group = suitedGroups[i];
    if (group.length > 0) {
      const tile = group[0];
      const suit = tile.type;
      const value = tile.value!;
      
      // Check if we can form a sequence starting with this tile
      if (value <= 7) { // Can form sequence with value, value+1, value+2
        const nextGroup = groups.find(g => 
          g.length > 0 && g[0].type === suit && g[0].value === value + 1
        );
        const thirdGroup = groups.find(g => 
          g.length > 0 && g[0].type === suit && g[0].value === value + 2
        );
        
        if (nextGroup && thirdGroup) {
          const newGroups = groups.map(g => {
            if (g === group) return g.slice(1);
            if (g === nextGroup) return g.slice(1);
            if (g === thirdGroup) return g.slice(1);
            return g;
          });
          
          if (canFormSets(newGroups.filter(g => g.length > 0), setsNeeded - 1)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
};

// NEW: Analyze winning hand to break it down into sets and pair
export const analyzeWinningHand = (hand: Tile[], exposedSets: Tile[][] = []): {
  sets: Tile[][];
  pair: Tile[];
  handType: string;
  isSpecialHand: boolean;
  allTiles: Tile[];
} => {
  const allTiles = [...hand, ...exposedSets.flat()];
  
  // Check for special hands first
  const tileMap = new Map<string, Tile[]>();
  hand.forEach(tile => {
    const key = getTileKey(tile);
    if (!tileMap.has(key)) {
      tileMap.set(key, []);
    }
    tileMap.get(key)!.push(tile);
  });

  const groups = Array.from(tileMap.values());
  
  // Check Seven Pairs
  if (exposedSets.length === 0 && checkSevenPairs(groups)) {
    return {
      sets: groups.filter(g => g.length === 2).slice(0, 6), // First 6 pairs as "sets"
      pair: groups.filter(g => g.length === 2)[6] || [], // Last pair
      handType: 'Seven Pairs',
      isSpecialHand: true,
      allTiles
    };
  }
  
  // Check Thirteen Orphans
  if (exposedSets.length === 0 && checkThirteenOrphans(groups)) {
    const pairGroup = groups.find(g => g.length === 2) || [];
    const singleGroups = groups.filter(g => g.length === 1);
    return {
      sets: [singleGroups.slice(0, 3).flat(), singleGroups.slice(3, 6).flat(), singleGroups.slice(6, 9).flat(), singleGroups.slice(9).flat()].filter(s => s.length > 0),
      pair: pairGroup,
      handType: 'Thirteen Orphans',
      isSpecialHand: true,
      allTiles
    };
  }
  
  // Standard hand analysis
  const result = analyzeStandardHand(hand, exposedSets);
  return {
    ...result,
    handType: 'Standard Hand',
    isSpecialHand: false,
    allTiles
  };
};

// Helper function to analyze standard winning hands
const analyzeStandardHand = (hand: Tile[], exposedSets: Tile[][]): {
  sets: Tile[][];
  pair: Tile[];
} => {
  // Start with exposed sets
  const sets = [...exposedSets];
  
  // Group hand tiles by type
  const tileMap = new Map<string, Tile[]>();
  hand.forEach(tile => {
    const key = getTileKey(tile);
    if (!tileMap.has(key)) {
      tileMap.set(key, []);
    }
    tileMap.get(key)!.push(tile);
  });

  const groups = Array.from(tileMap.values());
  
  // Find the pair first
  let pair: Tile[] = [];
  const remainingGroups = [...groups];
  
  for (let i = 0; i < remainingGroups.length; i++) {
    if (remainingGroups[i].length >= 2) {
      pair = remainingGroups[i].slice(0, 2);
      remainingGroups[i] = remainingGroups[i].slice(2);
      if (remainingGroups[i].length === 0) {
        remainingGroups.splice(i, 1);
      }
      break;
    }
  }
  
  // Form sets from remaining tiles
  const setsNeeded = 4 - exposedSets.length;
  const handSets = extractSetsFromGroups(remainingGroups, setsNeeded);
  
  return {
    sets: [...sets, ...handSets],
    pair
  };
};

// Helper function to extract sets from grouped tiles
const extractSetsFromGroups = (groups: Tile[][], setsNeeded: number): Tile[][] => {
  const sets: Tile[][] = [];
  const workingGroups = groups.map(g => [...g]);
  
  // Extract kongs first
  for (let i = 0; i < workingGroups.length && sets.length < setsNeeded; i++) {
    if (workingGroups[i].length >= 4) {
      sets.push(workingGroups[i].slice(0, 4));
      workingGroups[i] = workingGroups[i].slice(4);
    }
  }
  
  // Extract triplets
  for (let i = 0; i < workingGroups.length && sets.length < setsNeeded; i++) {
    if (workingGroups[i].length >= 3) {
      sets.push(workingGroups[i].slice(0, 3));
      workingGroups[i] = workingGroups[i].slice(3);
    }
  }
  
  // Extract sequences
  while (sets.length < setsNeeded) {
    let foundSequence = false;
    
    for (let i = 0; i < workingGroups.length && !foundSequence; i++) {
      const group = workingGroups[i];
      if (group.length > 0) {
        const tile = group[0];
        if (tile.value && (tile.type === 'character' || tile.type === 'bamboo' || tile.type === 'dot')) {
          const suit = tile.type;
          const value = tile.value;
          
          // Look for sequence
          const nextGroup = workingGroups.find(g => 
            g.length > 0 && g[0].type === suit && g[0].value === value + 1
          );
          const thirdGroup = workingGroups.find(g => 
            g.length > 0 && g[0].type === suit && g[0].value === value + 2
          );
          
          if (nextGroup && thirdGroup) {
            const sequence = [group[0], nextGroup[0], thirdGroup[0]];
            sets.push(sequence);
            
            // Remove used tiles
            group.splice(0, 1);
            nextGroup.splice(0, 1);
            thirdGroup.splice(0, 1);
            
            foundSequence = true;
          }
        }
      }
    }
    
    if (!foundSequence) break;
  }
  
  return sets;
};

// Check if a hand is one tile away from winning (for better bot AI)
export const isOneAwayFromWin = (hand: Tile[], exposedSets: Tile[][] = []): Tile[] => {
  const winningTiles: Tile[] = [];
  
  // Create a test set of all possible tiles
  const allPossibleTiles = createTileSet();
  
  // Test each possible tile to see if it completes the hand
  for (const testTile of allPossibleTiles) {
    const testHand = [...hand, testTile];
    if (isWinningHand(testHand, exposedSets)) {
      // Check if this tile type is not already in our winning tiles
      const tileKey = getTileKey(testTile);
      if (!winningTiles.some(tile => getTileKey(tile) === tileKey)) {
        winningTiles.push(testTile);
      }
    }
  }
  
  return winningTiles;
};

// FIXED: Calculate hand score with proper kong recognition
export const calculateWinScore = (
  hand: Tile[], 
  exposedSets: Tile[][] = [], 
  winType: 'self-drawn' | 'claimed' = 'claimed',
  isDealer: boolean = false
): number => {
  let baseScore = 1;
  let multiplier = 1;
  
  const allTiles = [...hand, ...exposedSets.flat()];
  
  // Check for special hands (higher scores)
  const tileMap = new Map<string, Tile[]>();
  allTiles.forEach(tile => {
    const key = getTileKey(tile);
    if (!tileMap.has(key)) tileMap.set(key, []);
    tileMap.get(key)!.push(tile);
  });
  
  const groups = Array.from(tileMap.values());
  
  // Seven Pairs
  if (checkSevenPairs(groups)) {
    baseScore = 4;
  }
  
  // Thirteen Orphans
  if (checkThirteenOrphans(groups)) {
    baseScore = 8;
  }
  
  // Kong bonus - each kong adds significant points
  const kongs = exposedSets.filter(set => set.length === 4);
  const concealedKongs = groups.filter(group => group.length === 4);
  
  // Exposed kongs
  kongs.forEach(() => {
    multiplier *= 1.5;
  });
  
  // Concealed kongs (higher bonus)
  concealedKongs.forEach(() => {
    multiplier *= 2;
  });
  
  // All same suit
  const suits = new Set(allTiles.filter(t => t.type !== 'dragon' && t.type !== 'wind').map(t => t.type));
  if (suits.size === 1) {
    multiplier *= 2;
  }
  
  // All honor tiles (dragons and winds)
  const honorTiles = allTiles.filter(t => t.type === 'dragon' || t.type === 'wind');
  if (honorTiles.length === allTiles.length) {
    multiplier *= 3;
  }
  
  // Concealed hand bonus (no exposed sets)
  if (exposedSets.length === 0) {
    multiplier *= 2;
  }
  
  // Self-drawn bonus
  if (winType === 'self-drawn') {
    multiplier *= 2;
  }
  
  // Dealer bonus
  if (isDealer) {
    multiplier *= 1.5;
  }
  
  return Math.floor(baseScore * multiplier);
};

// Check if game should end in a draw
export const checkDrawCondition = (wallSize: number, turnNumber: number): 'wall-exhausted' | 'too-many-turns' | null => {
  // Wall exhausted (most common draw condition)
  if (wallSize <= 14) { // Keep 14 tiles as dead wall
    return 'wall-exhausted';
  }
  
  // Too many turns without progress (optional rule)
  if (turnNumber > 200) {
    return 'too-many-turns';
  }
  
  return null;
};

// Calculate final scores for draw condition
export const calculateDrawScores = (players: { hand: Tile[], exposedSets: Tile[][], isDealer: boolean }[]): number[] => {
  return players.map(player => {
    let score = 0;
    const allTiles = [...player.hand, ...player.exposedSets.flat()];
    
    // Base score for tile count
    score += allTiles.length;
    
    // Bonus for exposed sets
    score += player.exposedSets.length * 5;
    
    // Bonus for kongs (4-tile sets)
    const kongs = player.exposedSets.filter(set => set.length === 4);
    score += kongs.length * 10;
    
    // Bonus for honor tiles
    const honorTiles = allTiles.filter(tile => tile.type === 'dragon' || tile.type === 'wind');
    score += honorTiles.length * 2;
    
    // Bonus for pairs
    const tileMap = new Map<string, number>();
    allTiles.forEach(tile => {
      const key = getTileKey(tile);
      tileMap.set(key, (tileMap.get(key) || 0) + 1);
    });
    
    const pairs = Array.from(tileMap.values()).filter(count => count >= 2);
    score += pairs.length * 3;
    
    // Bonus for being close to winning
    const winningTiles = isOneAwayFromWin(player.hand, player.exposedSets);
    if (winningTiles.length > 0) {
      score += 10; // Bonus for being in tenpai (ready to win)
    }
    
    // Dealer bonus
    if (player.isDealer) {
      score = Math.floor(score * 1.2);
    }
    
    return score;
  });
};

// Calculate hand value for wall exhaustion scoring
export const calculateHandValue = (hand: Tile[], exposedSets: Tile[][]): number => {
  let score = 0;
  const allTiles = [...hand, ...exposedSets.flat()];
  
  // Base score for tile count
  score += allTiles.length;
  
  // Bonus for exposed sets (melds)
  score += exposedSets.length * 5;
  
  // Special bonus for kongs (4-tile sets)
  const kongs = exposedSets.filter(set => set.length === 4);
  score += kongs.length * 15;
  
  // Bonus for honor tiles (dragons and winds)
  const honorTiles = allTiles.filter(tile => tile.type === 'dragon' || tile.type === 'wind');
  score += honorTiles.length * 2;
  
  // Bonus for pairs
  const tileMap = new Map<string, number>();
  allTiles.forEach(tile => {
    const key = `${tile.type}-${tile.value || tile.dragon || tile.wind}`;
    tileMap.set(key, (tileMap.get(key) || 0) + 1);
  });
  
  const pairs = Array.from(tileMap.values()).filter(count => count >= 2);
  score += pairs.length * 3;
  
  // Bonus for triplets
  const triplets = Array.from(tileMap.values()).filter(count => count >= 3);
  score += triplets.length * 8;
  
  // Bonus for sequences (simplified detection)
  const suitTiles = {
    bamboo: allTiles.filter(t => t.type === 'bamboo').map(t => t.value!).sort((a, b) => a - b),
    character: allTiles.filter(t => t.type === 'character').map(t => t.value!).sort((a, b) => a - b),
    dot: allTiles.filter(t => t.type === 'dot').map(t => t.value!).sort((a, b) => a - b)
  };
  
  Object.values(suitTiles).forEach(values => {
    for (let i = 0; i < values.length - 2; i++) {
      if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
        score += 6; // Sequence bonus
      }
    }
  });
  
  // Bonus for concealed hand (no exposed sets)
  if (exposedSets.length === 0) {
    score += 10;
  }
  
  return score;
};
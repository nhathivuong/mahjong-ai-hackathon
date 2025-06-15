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

export const isWinningHand = (hand: Tile[]): boolean => {
  if (hand.length !== 14) return false;
  
  // Count each unique tile
  const tileMap = new Map<string, number>();
  
  hand.forEach(tile => {
    const key = `${tile.type}-${tile.value || tile.dragon || tile.wind}`;
    tileMap.set(key, (tileMap.get(key) || 0) + 1);
  });

  const counts = Array.from(tileMap.values()).sort((a, b) => b - a);
  
  // Check for valid winning patterns
  return checkWinningPattern(counts);
};

const checkWinningPattern = (counts: number[]): boolean => {
  // Pattern 1: 4 triplets + 1 pair (standard winning hand)
  if (counts.length === 5) {
    const sortedCounts = [...counts].sort((a, b) => b - a);
    return sortedCounts[0] === 3 && sortedCounts[1] === 3 && 
           sortedCounts[2] === 3 && sortedCounts[3] === 3 && sortedCounts[4] === 2;
  }
  
  // Pattern 2: 7 pairs (special winning hand)
  if (counts.length === 7) {
    return counts.every(count => count === 2);
  }
  
  // Pattern 3: All same suit sequences + pair
  // This is simplified - real mahjong has more complex sequence checking
  if (counts.includes(2)) {
    const withoutPair = counts.filter(count => count !== 2);
    return withoutPair.every(count => count === 3) && withoutPair.length === 4;
  }
  
  return false;
};
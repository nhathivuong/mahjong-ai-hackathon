import React, { useState } from 'react';
import { DiscardedTile } from '../types/mahjong';
import TileComponent from './TileComponent';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DiscardHistoryProps {
  discardPile: DiscardedTile[];
  players: { id: string; name: string }[];
}

const DiscardHistory: React.FC<DiscardHistoryProps> = ({ discardPile, players }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const getPlayerPosition = (playerId: string): string => {
    switch (playerId) {
      case 'player1': return 'bottom';
      case 'bot1': return 'right';
      case 'bot2': return 'top';
      case 'bot3': return 'left';
      default: return 'bottom';
    }
  };

  const getPlayerColor = (playerId: string): string => {
    switch (playerId) {
      case 'player1': return 'border-blue-400 bg-blue-50';
      case 'bot1': return 'border-green-400 bg-green-50';
      case 'bot2': return 'border-red-400 bg-red-50';
      case 'bot3': return 'border-purple-400 bg-purple-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const groupDiscardsByPlayer = () => {
    const grouped: { [key: string]: DiscardedTile[] } = {};
    discardPile.forEach(discard => {
      if (!grouped[discard.playerId]) {
        grouped[discard.playerId] = [];
      }
      grouped[discard.playerId].push(discard);
    });
    return grouped;
  };

  // Calculate optimal grid dimensions for balanced rectangular layout
  const calculateGridDimensions = (tileCount: number): { cols: number; rows: number } => {
    if (tileCount === 0) return { cols: 1, rows: 1 };
    if (tileCount === 1) return { cols: 1, rows: 1 };
    
    // Find the best rectangular dimensions (closest to square ratio)
    let bestCols = 1;
    let bestRows = tileCount;
    let bestRatio = Math.max(bestCols, bestRows) / Math.min(bestCols, bestRows);
    
    // Test different column counts to find the most balanced rectangle
    for (let cols = 1; cols <= Math.ceil(Math.sqrt(tileCount * 1.5)); cols++) {
      const rows = Math.ceil(tileCount / cols);
      const ratio = Math.max(cols, rows) / Math.min(cols, rows);
      
      // Prefer layouts that are closer to rectangular (not too wide or tall)
      if (ratio < bestRatio || (ratio === bestRatio && cols > bestCols)) {
        bestCols = cols;
        bestRows = rows;
        bestRatio = ratio;
      }
    }
    
    return { cols: bestCols, rows: bestRows };
  };

  // Always use multi-row layout - no toggle needed
  const getMultiRowLayout = (tileCount: number, position: string) => {
    const maxTiles = Math.min(tileCount, 20); // Reduced max tiles for better fit
    return {
      maxTiles,
      layout: 'grid'
    };
  };

  // Generate responsive grid classes with proper constraints
  const getGridClasses = (tileCount: number, position: string): string => {
    const layout = getMultiRowLayout(tileCount, position);
    const actualTileCount = Math.min(tileCount, layout.maxTiles);
    
    // Adjust grid based on position with proper responsive constraints
    if (position === 'left' || position === 'right') {
      // Vertical positions: limit to 2-3 columns max
      if (actualTileCount <= 4) {
        return 'grid grid-cols-2 gap-0.5 justify-center max-h-[280px] overflow-hidden';
      } else if (actualTileCount <= 9) {
        return 'grid grid-cols-2 sm:grid-cols-3 gap-0.5 justify-center max-h-[280px] overflow-hidden';
      } else {
        return 'grid grid-cols-2 sm:grid-cols-3 gap-0.5 justify-center max-h-[280px] overflow-hidden';
      }
    } else {
      // Horizontal positions: limit width and use responsive columns
      if (actualTileCount <= 6) {
        return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-0.5 justify-center max-w-[400px] sm:max-w-[500px]';
      } else if (actualTileCount <= 12) {
        return 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-0.5 justify-center max-w-[400px] sm:max-w-[500px] md:max-w-[600px]';
      } else {
        return 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-0.5 justify-center max-w-[400px] sm:max-w-[500px] md:max-w-[600px]';
      }
    }
  };

  // Generate responsive grid classes for detailed view
  const getDetailedGridClasses = (tileCount: number): string => {
    const { cols } = calculateGridDimensions(tileCount);
    
    // Responsive adjustments for different screen sizes with proper constraints
    if (cols <= 3) {
      return `grid grid-cols-${Math.min(cols, 3)} gap-2 sm:gap-3 justify-center`;
    } else if (cols <= 6) {
      return `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-${Math.min(cols, 6)} gap-2 sm:gap-3 justify-center`;
    } else if (cols <= 8) {
      return `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-${Math.min(cols, 8)} gap-2 sm:gap-3 justify-center`;
    } else {
      return `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-${Math.min(cols, 10)} gap-2 sm:gap-3 justify-center`;
    }
  };

  // Calculate tile size based on container and tile count
  const getTileSize = (tileCount: number): string => {
    if (tileCount <= 4) {
      return 'w-12 h-16 sm:w-14 sm:h-18 md:w-16 md:h-20'; // Responsive sizing
    } else if (tileCount <= 9) {
      return 'w-10 h-14 sm:w-12 sm:h-16 md:w-14 md:h-18';
    } else if (tileCount <= 16) {
      return 'w-8 h-12 sm:w-10 sm:h-14 md:w-12 md:h-16';
    } else {
      return 'w-6 h-10 sm:w-8 sm:h-12 md:w-10 md:h-14';
    }
  };

  const groupedDiscards = groupDiscardsByPlayer();
  const mostRecentDiscard = discardPile[discardPile.length - 1];

  // If a specific player is selected, show all their tiles in responsive grid
  if (selectedPlayer) {
    const playerDiscards = groupedDiscards[selectedPlayer] || [];
    const playerName = players.find(p => p.id === selectedPlayer)?.name || 'Unknown';
    const gridClasses = getDetailedGridClasses(playerDiscards.length);
    const tileSize = getTileSize(playerDiscards.length);
    
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <h3 className="text-white font-medium text-base sm:text-lg">
              {playerName}'s Discards
            </h3>
          </div>
          <div className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${getPlayerColor(selectedPlayer)}`}>
            {playerName}
          </div>
        </div>
        
        {/* Responsive Grid Layout */}
        <div className="bg-emerald-800/20 rounded-xl p-3 sm:p-4 md:p-6 overflow-hidden">
          {playerDiscards.length > 0 ? (
            <div className={gridClasses}>
              {playerDiscards.map((discard, index) => (
                <div key={`${discard.playerId}-${index}`} className="relative flex justify-center">
                  <div className={`${tileSize} relative`}>
                    <TileComponent
                      tile={discard.tile}
                      className="w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-200"
                    />
                    {/* Turn number indicator */}
                    <div className="absolute -top-1 -right-1 bg-black/70 text-white text-xs rounded-full w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center font-bold text-[8px] sm:text-xs">
                      {discard.turnNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-emerald-200 py-8 sm:py-12">
              <div className="text-3xl sm:text-4xl mb-4">🀄</div>
              <p className="text-base sm:text-lg">No discards yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-base sm:text-lg">Discard History</h3>
        <div className="text-emerald-200 text-xs sm:text-sm">
          Click names for full grid view
        </div>
      </div>
      
      {/* Multi-row layout by default for ALL positions */}
      <div className="relative w-full h-[28rem] sm:h-[32rem] bg-emerald-800/30 rounded-xl border border-emerald-600/30 overflow-hidden">
        
        {/* Center - Most Recent Discard - Clean Center Display */}
        <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          {mostRecentDiscard ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <TileComponent
                  tile={mostRecentDiscard.tile}
                  className="scale-100 sm:scale-110 shadow-xl border-2 border-amber-400"
                />
              </div>
              <div className="bg-black/70 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
                <p className="text-white text-xs sm:text-sm font-medium">
                  {mostRecentDiscard.playerName}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center text-emerald-200">
              <div className="w-12 h-16 sm:w-16 sm:h-20 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center mb-2">
                <span className="text-xl sm:text-2xl">?</span>
              </div>
              <p className="text-xs sm:text-sm">No discards yet</p>
            </div>
          )}
        </div>

        {/* Player Discard Areas - Clean Layout */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          const layout = getMultiRowLayout(playerDiscards.length, position);
          
          let positionClasses = '';
          let containerClasses = '';
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-2 left-1/2 transform -translate-x-1/2';
              containerClasses = 'max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px]';
              break;
            case 'top':
              positionClasses = 'absolute top-2 left-1/2 transform -translate-x-1/2';
              containerClasses = 'max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px]';
              break;
            case 'left':
              positionClasses = 'absolute left-2 top-1/2 transform -translate-y-1/2';
              containerClasses = 'max-w-16 sm:max-w-20 md:max-w-24';
              break;
            case 'right':
              positionClasses = 'absolute right-2 top-1/2 transform -translate-y-1/2';
              containerClasses = 'max-w-16 sm:max-w-20 md:max-w-24';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              {/* Clean player label */}
              <div className="text-center mb-1">
                <button
                  onClick={() => setSelectedPlayer(player.id)}
                  className={`inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-md text-xs font-medium transition-all hover:scale-105 ${getPlayerColor(player.id)} hover:shadow-md`}
                >
                  <span className="truncate max-w-[60px] sm:max-w-none">{player.name}</span>
                  <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                </button>
              </div>
              
              {/* Tile container */}
              <div className={`${containerClasses} bg-white/5 rounded-lg border border-white/10 p-0.5 sm:p-1`}>
                {playerDiscards.length > 0 ? (
                  <div className={getGridClasses(playerDiscards.length, position)}>
                    {playerDiscards.slice(0, layout.maxTiles).map((discard, index) => (
                      <div 
                        key={`${discard.playerId}-${index}`}
                        className="flex-shrink-0 relative"
                      >
                        <TileComponent
                          tile={discard.tile}
                          height="compact"
                          className="opacity-80 hover:opacity-100 transition-opacity duration-200"
                        />
                      </div>
                    ))}
                    {playerDiscards.length > layout.maxTiles && (
                      <div className="flex items-center justify-center text-emerald-300 text-[10px] sm:text-xs p-0.5 sm:p-1 bg-white/10 rounded border border-white/20">
                        +{playerDiscards.length - layout.maxTiles}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-emerald-300 text-[10px] sm:text-xs p-1 sm:p-2">
                    No discards
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Summary */}
      <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm">
        <div className="text-emerald-200">
          {mostRecentDiscard && (
            <>
              Last: <span className="font-medium text-white">{mostRecentDiscard.playerName}</span>
              <span className="ml-2 text-xs text-gray-300">Turn {mostRecentDiscard.turnNumber}</span>
            </>
          )}
        </div>
        <div className="text-emerald-200 text-xs">
          Click names for full grid view
        </div>
      </div>
    </div>
  );
};

export default DiscardHistory;
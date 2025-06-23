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

  // Calculate responsive layout - now supports multi-row for ALL positions
  const getResponsiveLayout = (tileCount: number, position: string) => {
    // All positions now support multi-row when needed
    const shouldUseMultiRow = tileCount > 8;
    const maxTiles = shouldUseMultiRow ? Math.min(tileCount, 24) : Math.min(tileCount, 12);

    return {
      maxTiles,
      layout: shouldUseMultiRow ? 'grid' : (position === 'left' || position === 'right' ? 'vertical' : 'horizontal'),
      showMultiRow: shouldUseMultiRow
    };
  };

  // Generate responsive grid classes based on tile count and position
  const getGridClasses = (tileCount: number, position: string): string => {
    const layout = getResponsiveLayout(tileCount, position);
    
    if (!layout.showMultiRow) {
      // Single row/column layout for fewer tiles
      if (position === 'left' || position === 'right') {
        return 'flex flex-col gap-1 max-h-[280px] overflow-hidden';
      } else {
        return 'flex flex-row gap-1 flex-wrap justify-center max-w-[500px]';
      }
    }

    // Multi-row responsive grid for ALL positions when needed
    const { cols } = calculateGridDimensions(Math.min(tileCount, layout.maxTiles));
    
    // Adjust grid based on position
    if (position === 'left' || position === 'right') {
      // Vertical multi-row: fewer columns, more rows
      const verticalCols = Math.min(cols, 3);
      return `grid gap-1 justify-center max-h-[320px] overflow-hidden
        grid-cols-${Math.min(verticalCols, 2)} 
        sm:grid-cols-${Math.min(verticalCols, 3)}`;
    } else {
      // Horizontal multi-row: more columns, fewer rows
      const horizontalCols = Math.min(cols, 12);
      return `grid gap-1 justify-center max-w-[600px]
        grid-cols-${Math.min(horizontalCols, 6)} 
        sm:grid-cols-${Math.min(horizontalCols, 8)} 
        md:grid-cols-${Math.min(horizontalCols, 10)} 
        lg:grid-cols-${horizontalCols}`;
    }
  };

  // Generate responsive grid classes for detailed view
  const getDetailedGridClasses = (tileCount: number): string => {
    const { cols } = calculateGridDimensions(tileCount);
    
    // Responsive adjustments for different screen sizes
    let responsiveClasses = '';
    if (cols <= 3) {
      responsiveClasses = `grid-cols-${cols} sm:grid-cols-${cols} md:grid-cols-${cols}`;
    } else if (cols <= 6) {
      responsiveClasses = `grid-cols-${Math.min(cols, 4)} sm:grid-cols-${Math.min(cols, 5)} md:grid-cols-${cols}`;
    } else if (cols <= 8) {
      responsiveClasses = `grid-cols-4 sm:grid-cols-6 md:grid-cols-${cols}`;
    } else {
      responsiveClasses = `grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-${Math.min(cols, 10)} xl:grid-cols-${Math.min(cols, 12)}`;
    }
    
    return `grid ${responsiveClasses} gap-2 sm:gap-3`;
  };

  // Calculate tile size based on container and tile count
  const getTileSize = (tileCount: number): string => {
    if (tileCount <= 4) {
      return 'w-16 h-20'; // Larger for few tiles
    } else if (tileCount <= 9) {
      return 'w-14 h-18'; // Medium size
    } else if (tileCount <= 16) {
      return 'w-12 h-16'; // Smaller for more tiles
    } else {
      return 'w-10 h-14'; // Compact for many tiles
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
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <h3 className="text-white font-medium text-lg">
              {playerName}'s Discards ({playerDiscards.length} tiles)
            </h3>
          </div>
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${getPlayerColor(selectedPlayer)}`}>
            {playerName}
          </div>
        </div>
        
        {/* Responsive Grid Layout */}
        <div className="bg-emerald-800/20 rounded-xl p-4 sm:p-6">
          {playerDiscards.length > 0 ? (
            <div className={gridClasses}>
              {playerDiscards.map((discard, index) => (
                <div key={`${discard.playerId}-${index}`} className="relative flex justify-center">
                  <div className={`${tileSize} relative`}>
                    <TileComponent
                      tile={discard.tile}
                      className="w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-200"
                    />
                    {/* Turn number indicator - always visible in detailed view */}
                    <div className="absolute -top-1 -right-1 bg-black/70 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {discard.turnNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-emerald-200 py-12">
              <div className="text-4xl mb-4">🀄</div>
              <p className="text-lg">No discards yet</p>
            </div>
          )}
        </div>
        
        {/* Grid Info */}
        {playerDiscards.length > 0 && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-4 text-sm text-emerald-200">
              <span>Total: {playerDiscards.length} tiles</span>
              <span>•</span>
              <span>Layout: {calculateGridDimensions(playerDiscards.length).cols} × {calculateGridDimensions(playerDiscards.length).rows}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-lg">Discard History</h3>
        <div className="text-emerald-200 text-sm">
          Click names for full grid view
        </div>
      </div>
      
      {/* Enhanced layout with responsive multi-row support for ALL positions */}
      <div className="relative w-full h-[32rem] bg-emerald-800/30 rounded-xl border border-emerald-600/30 overflow-hidden">
        
        {/* Center - Most Recent Discard */}
        <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          {mostRecentDiscard ? (
            <div className="text-center">
              <div className="mb-2">
                <TileComponent
                  tile={mostRecentDiscard.tile}
                  className="scale-110 shadow-xl border-2 border-amber-400"
                />
              </div>
              <div className="bg-black/70 rounded-lg px-3 py-1">
                <p className="text-white text-sm font-medium">
                  {mostRecentDiscard.playerName}
                </p>
                <p className="text-emerald-200 text-xs">
                  Latest (Turn {mostRecentDiscard.turnNumber})
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-emerald-200">
              <div className="w-16 h-20 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center mb-2">
                <span className="text-2xl">?</span>
              </div>
              <p className="text-sm">No discards yet</p>
            </div>
          )}
        </div>

        {/* Player Discard Areas - Enhanced Multi-row Layout for ALL positions */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          const layout = getResponsiveLayout(playerDiscards.length, position);
          
          let positionClasses = '';
          let containerClasses = '';
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-2 left-1/2 transform -translate-x-1/2';
              containerClasses = layout.showMultiRow ? 'max-w-[600px]' : 'max-w-[500px]';
              break;
            case 'top':
              positionClasses = 'absolute top-2 left-1/2 transform -translate-x-1/2';
              containerClasses = layout.showMultiRow ? 'max-w-[600px]' : 'max-w-[500px]';
              break;
            case 'left':
              positionClasses = 'absolute left-2 top-1/2 transform -translate-y-1/2';
              containerClasses = layout.showMultiRow ? 'max-w-24' : 'max-w-20';
              break;
            case 'right':
              positionClasses = 'absolute right-2 top-1/2 transform -translate-y-1/2';
              containerClasses = layout.showMultiRow ? 'max-w-24' : 'max-w-20';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              {/* Player label - shows multi-row indicator when applicable */}
              <div className="text-center mb-1">
                <button
                  onClick={() => setSelectedPlayer(player.id)}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all hover:scale-105 ${getPlayerColor(player.id)} hover:shadow-md`}
                >
                  <span>{player.name}</span>
                  <span className="text-gray-600">({playerDiscards.length})</span>
                  <ChevronRight className="w-3 h-3" />
                  {layout.showMultiRow && (
                    <span className="text-xs text-blue-600 font-bold">📊</span>
                  )}
                </button>
              </div>
              
              {/* Enhanced responsive tile container - now supports multi-row for ALL positions */}
              <div className={`${containerClasses} bg-white/5 rounded-lg border border-white/10 p-1`}>
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
                      <div className="flex items-center justify-center text-emerald-300 text-xs p-1 bg-white/10 rounded border border-white/20">
                        +{playerDiscards.length - layout.maxTiles}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-emerald-300 text-xs p-2">
                    No discards
                  </div>
                )}
              </div>
              
              {/* Multi-row indicator for ALL positions when applicable */}
              {layout.showMultiRow && (
                <div className="text-center mt-1">
                  <div className="text-xs text-blue-300 bg-blue-500/20 rounded px-2 py-0.5 inline-block">
                    {position === 'left' || position === 'right' ? 'Multi-col' : 'Multi-row'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Summary */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="text-emerald-200">
          Total Discards: <span className="font-medium text-white">{discardPile.length}</span>
        </div>
        {mostRecentDiscard && (
          <div className="text-emerald-200">
            Last: <span className="font-medium text-white">{mostRecentDiscard.playerName}</span>
            <span className="ml-2 text-xs text-gray-300">Turn {mostRecentDiscard.turnNumber}</span>
          </div>
        )}
        <div className="text-emerald-200 text-xs">
          📊 = Multi-layout • Click names for full grid
        </div>
      </div>
    </div>
  );
};

export default DiscardHistory;
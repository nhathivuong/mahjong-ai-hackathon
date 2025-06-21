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

  // Generate responsive grid classes based on tile count
  const getGridClasses = (tileCount: number): string => {
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
    const gridClasses = getGridClasses(playerDiscards.length);
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
                <div key={`${discard.playerId}-${index}`} className="relative group flex justify-center">
                  <div className={`${tileSize} relative`}>
                    <TileComponent
                      tile={discard.tile}
                      className="w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-200"
                    />
                    {/* Turn number indicator */}
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
          Click player names to see detailed view
        </div>
      </div>
      
      {/* Enhanced layout with better spacing - Always showing all tiles */}
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

        {/* Player Discard Areas - Clean Fixed Layout */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          
          let positionClasses = '';
          let containerClasses = '';
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-2 left-1/2 transform -translate-x-1/2';
              containerClasses = 'max-w-[400px]';
              break;
            case 'top':
              positionClasses = 'absolute top-2 left-1/2 transform -translate-x-1/2';
              containerClasses = 'max-w-[400px]';
              break;
            case 'left':
              positionClasses = 'absolute left-2 top-1/2 transform -translate-y-1/2';
              containerClasses = 'max-w-20';
              break;
            case 'right':
              positionClasses = 'absolute right-2 top-1/2 transform -translate-y-1/2';
              containerClasses = 'max-w-20';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              {/* Player label with click to expand */}
              <div className="text-center mb-1">
                <button
                  onClick={() => setSelectedPlayer(player.id)}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all hover:scale-105 ${getPlayerColor(player.id)} hover:shadow-md`}
                >
                  <span>{player.name}</span>
                  <span className="text-gray-600">({playerDiscards.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              
              {/* Clean tile container without scroll indicators */}
              <div className={`${containerClasses} bg-white/5 rounded-lg border border-white/10 p-1`}>
                {playerDiscards.length > 0 ? (
                  <div className={`${position === 'left' || position === 'right' ? 'flex flex-col' : 'flex flex-row'} gap-1 flex-wrap justify-center`}>
                    {playerDiscards.slice(0, 8).map((discard, index) => (
                      <div 
                        key={`${discard.playerId}-${index}`}
                        className="flex-shrink-0 relative group"
                      >
                        <TileComponent
                          tile={discard.tile}
                          height="compact"
                          className="opacity-80 hover:opacity-100 transition-opacity duration-200"
                        />
                        {/* Turn number on hover */}
                        <div className="absolute -top-1 -right-1 bg-black/70 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {discard.turnNumber}
                        </div>
                      </div>
                    ))}
                    {playerDiscards.length > 8 && (
                      <div className="flex items-center justify-center text-emerald-300 text-xs p-1 bg-white/10 rounded border border-white/20">
                        +{playerDiscards.length - 8}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-emerald-300 text-xs p-2">
                    No discards
                  </div>
                )}
              </div>
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
          Click names for detailed grid view
        </div>
      </div>
    </div>
  );
};

export default DiscardHistory;
import React, { useState } from 'react';
import { DiscardedTile } from '../types/mahjong';
import TileComponent from './TileComponent';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface DiscardHistoryProps {
  discardPile: DiscardedTile[];
  players: { id: string; name: string }[];
}

const DiscardHistory: React.FC<DiscardHistoryProps> = ({ discardPile, players }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showAllTiles, setShowAllTiles] = useState(false);

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

  const groupedDiscards = groupDiscardsByPlayer();
  const mostRecentDiscard = discardPile[discardPile.length - 1];

  // If a specific player is selected, show all their tiles
  if (selectedPlayer) {
    const playerDiscards = groupedDiscards[selectedPlayer] || [];
    const playerName = players.find(p => p.id === selectedPlayer)?.name || 'Unknown';
    
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
        
        {/* All tiles for selected player in a scrollable grid */}
        <div className="max-h-80 overflow-y-auto bg-emerald-800/20 rounded-xl p-4">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-2">
            {playerDiscards.map((discard, index) => (
              <div key={`${discard.playerId}-${index}`} className="relative">
                <TileComponent
                  tile={discard.tile}
                  height="compact"
                  className="opacity-90 hover:opacity-100 transition-opacity duration-200"
                />
                {/* Turn number indicator */}
                <div className="absolute -top-1 -right-1 bg-black/70 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {discard.turnNumber}
                </div>
              </div>
            ))}
          </div>
          
          {playerDiscards.length === 0 && (
            <div className="text-center text-emerald-200 py-8">
              No discards yet
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-lg">Discard History</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAllTiles(!showAllTiles)}
            className="flex items-center space-x-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm"
          >
            {showAllTiles ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showAllTiles ? 'Show Recent' : 'Show All'}</span>
          </button>
        </div>
      </div>
      
      {/* Enhanced layout with better spacing */}
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

        {/* Player Discard Areas */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          const displayDiscards = showAllTiles ? playerDiscards : playerDiscards.slice(-12);
          const isBot = player.id !== 'player1';
          
          let positionClasses = '';
          let gridClasses = '';
          let maxTiles = 12;
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-2 left-1/2 transform -translate-x-1/2';
              gridClasses = 'grid-cols-6 grid-rows-2';
              maxTiles = 12;
              break;
            case 'top':
              positionClasses = 'absolute top-2 left-1/2 transform -translate-x-1/2';
              gridClasses = 'grid-cols-6 grid-rows-2';
              maxTiles = 12;
              break;
            case 'left':
              positionClasses = 'absolute left-2 top-1/2 transform -translate-y-1/2';
              gridClasses = 'grid-cols-2 grid-rows-6';
              maxTiles = 12;
              break;
            case 'right':
              positionClasses = 'absolute right-2 top-1/2 transform -translate-y-1/2';
              gridClasses = 'grid-cols-2 grid-rows-6';
              maxTiles = 12;
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
              
              {/* Tile grid */}
              <div className={`grid ${gridClasses} gap-0.5 w-fit h-fit`}>
                {displayDiscards.slice(0, maxTiles).map((discard, index) => (
                  <div 
                    key={`${discard.playerId}-${index}`}
                    className="w-[32px] h-[40px] flex items-center justify-center bg-white/5 rounded-md border border-white/10 relative group"
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
                
                {/* Fill empty grid cells if not showing all tiles */}
                {!showAllTiles && Array.from({ length: Math.max(0, maxTiles - displayDiscards.length) }, (_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className="w-[32px] h-[40px] bg-white/5 border border-white/10 rounded-md opacity-20"
                  />
                ))}
              </div>
              
              {/* Overflow indicator */}
              {!showAllTiles && playerDiscards.length > maxTiles && (
                <div className="text-center mt-0.5">
                  <div className="inline-block px-1.5 py-0.5 bg-amber-500/80 rounded text-xs text-white font-bold">
                    +{playerDiscards.length - maxTiles} more
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
          Click player names to see all their discards
        </div>
      </div>
    </div>
  );
};

export default DiscardHistory;
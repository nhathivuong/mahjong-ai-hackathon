import React from 'react';
import { DiscardedTile } from '../types/mahjong';
import TileComponent from './TileComponent';

interface DiscardHistoryProps {
  discardPile: DiscardedTile[];
  players: { id: string; name: string }[];
}

const DiscardHistory: React.FC<DiscardHistoryProps> = ({ discardPile, players }) => {
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

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <h3 className="text-white font-medium text-lg mb-3">Active Discards</h3>
      
      {/* Centered container with reduced height */}
      <div className="relative w-full h-80 bg-emerald-800/30 rounded-xl border border-emerald-600/30 overflow-hidden flex items-center justify-center">
        
        {/* Center - Most Recent Discard */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
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
                  Latest
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

        {/* Player Discard Areas - Centered and Compact */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          const recentDiscards = playerDiscards.slice(-6); // Reduced to 6 tiles for better fit
          const isBot = player.id !== 'player1';
          
          let positionClasses = '';
          let gridClasses = '';
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-4 left-1/2 transform -translate-x-1/2';
              gridClasses = 'grid-cols-3 grid-rows-2';
              break;
            case 'top':
              positionClasses = 'absolute top-4 left-1/2 transform -translate-x-1/2';
              gridClasses = 'grid-cols-3 grid-rows-2';
              break;
            case 'left':
              positionClasses = 'absolute left-4 top-1/2 transform -translate-y-1/2';
              gridClasses = 'grid-cols-2 grid-rows-3';
              break;
            case 'right':
              positionClasses = 'absolute right-4 top-1/2 transform -translate-y-1/2';
              gridClasses = 'grid-cols-2 grid-rows-3';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              {/* Centered label */}
              <div className="text-center mb-1">
                <div className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${getPlayerColor(player.id)}`}>
                  {player.name}
                  {playerDiscards.length > 0 && (
                    <span className="ml-1 text-gray-600">({playerDiscards.length})</span>
                  )}
                </div>
              </div>
              
              {/* Centered tile grid */}
              <div className={`grid ${gridClasses} gap-0.5 justify-center items-center`}>
                {recentDiscards.map((discard, index) => (
                  <div 
                    key={`${discard.playerId}-${index}`}
                    className="w-7 h-9 flex items-center justify-center"
                  >
                    <TileComponent
                      tile={discard.tile}
                      className="scale-[0.35] opacity-75 hover:opacity-100 hover:scale-[0.4] transition-all duration-200 border border-white/20 shadow-sm"
                    />
                    {/* Recent indicator */}
                    {index === recentDiscards.length - 1 && playerDiscards.length > 1 && (
                      <div className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-xs rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold text-[8px]">
                        !
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Fill empty grid cells with centered placeholders */}
                {Array.from({ length: Math.max(0, 6 - recentDiscards.length) }, (_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className="w-7 h-9 bg-white/5 border border-dashed border-white/10 rounded-sm opacity-30 flex items-center justify-center"
                  >
                    <span className="text-white/30 text-xs">·</span>
                  </div>
                ))}
              </div>
              
              {/* Centered overflow indicator */}
              {playerDiscards.length > 6 && (
                <div className="text-center mt-1">
                  <div className="inline-block px-1.5 py-0.5 bg-white/20 rounded text-xs text-white font-bold">
                    +{playerDiscards.length - 6}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact summary with reduced spacing */}
      {mostRecentDiscard && (
        <div className="mt-3 text-center">
          <div className="text-emerald-200 text-sm">
            Last: <span className="font-medium text-white">{mostRecentDiscard.playerName}</span>
            <span className="ml-2 text-xs text-gray-300">Turn {mostRecentDiscard.turnNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscardHistory;
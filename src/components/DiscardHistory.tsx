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
      <h3 className="text-white font-medium text-lg mb-4">Active Discards</h3>
      
      {/* Optimized Central Layout */}
      <div className="relative w-full h-80 bg-emerald-800/30 rounded-xl border border-emerald-600/30 overflow-hidden">
        
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

        {/* Optimized Player Discard Areas */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          const recentDiscards = playerDiscards.slice(-8); // Show last 8 discards for better visibility
          
          let positionClasses = '';
          let flexDirection = '';
          let tileScale = 'scale-[0.4]'; // Smaller tiles for compact layout
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-2 left-1/2 transform -translate-x-1/2';
              flexDirection = 'flex-row';
              break;
            case 'top':
              positionClasses = 'absolute top-2 left-1/2 transform -translate-x-1/2';
              flexDirection = 'flex-row';
              break;
            case 'left':
              positionClasses = 'absolute left-2 top-1/2 transform -translate-y-1/2';
              flexDirection = 'flex-col';
              break;
            case 'right':
              positionClasses = 'absolute right-2 top-1/2 transform -translate-y-1/2';
              flexDirection = 'flex-col';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              <div className="text-center mb-1">
                <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getPlayerColor(player.id)}`}>
                  {player.name}
                  <span className="ml-1 text-gray-600">({playerDiscards.length})</span>
                </div>
              </div>
              
              {/* Compact tile display with better spacing */}
              <div className={`flex ${flexDirection} gap-0.5 max-w-xs max-h-64 overflow-hidden`}>
                {recentDiscards.map((discard, index) => (
                  <div key={`${discard.playerId}-${index}`} className="relative">
                    <TileComponent
                      tile={discard.tile}
                      className={`${tileScale} opacity-75 hover:opacity-100 hover:scale-[0.45] transition-all duration-200 border border-white/20`}
                    />
                    {/* Turn number indicator for recent discards */}
                    {index === recentDiscards.length - 1 && playerDiscards.length > 1 && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        !
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Overflow indicator */}
                {playerDiscards.length > 8 && (
                  <div className="flex items-center justify-center w-6 h-8 bg-white/20 rounded-md border border-white/30">
                    <span className="text-white text-xs font-bold">
                      +{playerDiscards.length - 8}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Summary Bar */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="text-emerald-200">
          Total Active Discards: <span className="font-medium text-white">{discardPile.length}</span>
        </div>
        {mostRecentDiscard && (
          <div className="text-emerald-200">
            Last: <span className="font-medium text-white">{mostRecentDiscard.playerName}</span>
            <span className="ml-2 text-xs text-gray-300">Turn {mostRecentDiscard.turnNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscardHistory;
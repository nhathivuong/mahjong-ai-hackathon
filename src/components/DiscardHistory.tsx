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
      
      {/* Increased height to h-[28rem] for even more space */}
      <div className="relative w-full h-[28rem] bg-emerald-800/30 rounded-xl border border-emerald-600/30 overflow-hidden">
        
        {/* Center - Most Recent Discard - moved up slightly to avoid bottom overlap */}
        <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          {mostRecentDiscard && (
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
          )}
        </div>

        {/* Player Discard Areas with Uniform Tile Containers */}
        {players.map((player) => {
          const position = getPlayerPosition(player.id);
          const playerDiscards = groupedDiscards[player.id] || [];
          const recentDiscards = playerDiscards.slice(-8);
          const isBot = player.id !== 'player1';
          
          let positionClasses = '';
          let gridClasses = '';
          
          switch (position) {
            case 'bottom':
              // Moved much further down to prevent overlap with center
              positionClasses = 'absolute bottom-2 left-1/2 transform -translate-x-1/2';
              gridClasses = 'grid-cols-4 grid-rows-2';
              break;
            case 'top':
              // Moved further up to prevent overlap
              positionClasses = 'absolute top-2 left-1/2 transform -translate-x-1/2';
              gridClasses = 'grid-cols-4 grid-rows-2';
              break;
            case 'left':
              // Moved further left to prevent overlap
              positionClasses = 'absolute left-2 top-1/2 transform -translate-y-1/2';
              gridClasses = 'grid-cols-2 grid-rows-4';
              break;
            case 'right':
              // Moved further right to prevent overlap
              positionClasses = 'absolute right-2 top-1/2 transform -translate-y-1/2';
              gridClasses = 'grid-cols-2 grid-rows-4';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              {/* Bot labels on top, Player label below */}
              {isBot && (
                <div className="text-center mb-1">
                  <div className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${getPlayerColor(player.id)}`}>
                    {player.name}
                  </div>
                </div>
              )}
              
              {/* Tile grid with uniform containers - exact pixel dimensions for consistency */}
              <div className={`grid ${gridClasses} gap-0.5 w-fit h-fit ${isBot ? '' : 'mb-1'}`}>
                {recentDiscards.map((discard, index) => (
                  <div 
                    key={`${discard.playerId}-${index}`}
                    className="w-[32px] h-[40px] flex items-center justify-center bg-white/5 rounded-md border border-white/10"
                  >
                    <TileComponent
                      tile={discard.tile}
                      height="compact"
                      className="opacity-80 hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                ))}
                
                {/* Fill empty grid cells with uniform containers */}
                {Array.from({ length: Math.max(0, 8 - recentDiscards.length) }, (_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className="w-[32px] h-[40px] bg-white/5 border border-white/10 rounded-md opacity-20"
                  />
                ))}
              </div>
              
              {/* Player label below tiles (only for human player) */}
              {!isBot && (
                <div className="text-center">
                  <div className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${getPlayerColor(player.id)}`}>
                    {player.name} (Dealer)
                  </div>
                </div>
              )}
              
              {/* Overflow indicator - more compact */}
              {playerDiscards.length > 8 && (
                <div className="text-center mt-0.5">
                  <div className="inline-block px-1.5 py-0.5 bg-white/20 rounded text-xs text-white font-bold">
                    +{playerDiscards.length - 8}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Simplified Summary */}
      {mostRecentDiscard && (
        <div className="mt-4 text-center">
          <div className="text-emerald-200 text-sm">
            Last discard: <span className="font-medium text-white">{mostRecentDiscard.playerName}</span>
            <span className="ml-2 text-xs text-gray-300">Turn {mostRecentDiscard.turnNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscardHistory;
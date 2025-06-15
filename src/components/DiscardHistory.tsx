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
      <h3 className="text-white font-medium text-lg mb-4">Discard History</h3>
      
      {/* Central Layout */}
      <div className="relative w-full h-96 bg-emerald-800/30 rounded-xl border border-emerald-600/30">
        
        {/* Center - Most Recent Discard */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {mostRecentDiscard ? (
            <div className="text-center">
              <div className="mb-2">
                <TileComponent
                  tile={mostRecentDiscard.tile}
                  className="scale-125 shadow-lg"
                />
              </div>
              <div className="bg-black/50 rounded-lg px-3 py-1">
                <p className="text-white text-sm font-medium">
                  {mostRecentDiscard.playerName}
                </p>
                <p className="text-emerald-200 text-xs">
                  Latest Discard
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
          const recentDiscards = playerDiscards.slice(-6); // Show last 6 discards
          
          let positionClasses = '';
          let flexDirection = '';
          
          switch (position) {
            case 'bottom':
              positionClasses = 'absolute bottom-4 left-1/2 transform -translate-x-1/2';
              flexDirection = 'flex-row';
              break;
            case 'top':
              positionClasses = 'absolute top-4 left-1/2 transform -translate-x-1/2';
              flexDirection = 'flex-row';
              break;
            case 'left':
              positionClasses = 'absolute left-4 top-1/2 transform -translate-y-1/2';
              flexDirection = 'flex-col';
              break;
            case 'right':
              positionClasses = 'absolute right-4 top-1/2 transform -translate-y-1/2';
              flexDirection = 'flex-col';
              break;
          }

          return (
            <div key={player.id} className={positionClasses}>
              <div className="text-center mb-2">
                <div className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getPlayerColor(player.id)}`}>
                  {player.name}
                  <span className="ml-1 text-gray-600">({playerDiscards.length})</span>
                </div>
              </div>
              <div className={`flex ${flexDirection} gap-1`}>
                {recentDiscards.map((discard, index) => (
                  <div key={`${discard.playerId}-${index}`} className="relative">
                    <TileComponent
                      tile={discard.tile}
                      className="scale-50 opacity-80 hover:opacity-100 hover:scale-60 transition-all"
                    />
                  </div>
                ))}
                {playerDiscards.length > 6 && (
                  <div className="flex items-center justify-center w-8 h-10 bg-white/20 rounded-lg border border-white/30">
                    <span className="text-white text-xs">
                      +{playerDiscards.length - 6}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiscardHistory;
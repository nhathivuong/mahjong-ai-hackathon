import React, { useEffect, useState } from 'react';
import { Zap, Square, Users, Trophy } from 'lucide-react';
import TileComponent from './TileComponent';
import { Tile } from '../types/mahjong';

export type BotActionType = 'chow' | 'pung' | 'kong' | 'win';

interface BotActionIndicatorProps {
  action: BotActionType;
  playerName: string;
  tiles?: Tile[]; // Changed from string[] to Tile[] for full tile objects
  onComplete?: () => void;
  duration?: number;
}

const BotActionIndicator: React.FC<BotActionIndicatorProps> = ({
  action,
  playerName,
  tiles = [],
  onComplete,
  duration // Will be set based on action type
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  // Set different durations based on action type
  const getActionDuration = (actionType: BotActionType): number => {
    switch (actionType) {
      case 'win':
        return 4000; // Keep win longer for celebration
      case 'kong':
        return 1500; // Shorter for claims
      case 'pung':
        return 1200; // Even shorter for pung
      case 'chow':
        return 1000; // Shortest for chow (most common)
      default:
        return 2000;
    }
  };

  const actualDuration = duration || getActionDuration(action);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 200); // Faster fade out
    }, actualDuration);

    return () => clearTimeout(timer);
  }, [actualDuration, onComplete]);

  const getActionConfig = (action: BotActionType) => {
    switch (action) {
      case 'chow':
        return {
          icon: Users,
          label: 'Chow',
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-400',
          description: 'Called sequence'
        };
      case 'pung':
        return {
          icon: Square,
          label: 'Pung',
          color: 'from-green-500 to-green-600',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-400',
          description: 'Called triplet'
        };
      case 'kong':
        return {
          icon: Zap,
          label: 'Kong',
          color: 'from-purple-500 to-purple-600',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-400',
          description: 'Called quad'
        };
      case 'win':
        return {
          icon: Trophy,
          label: 'Mahjong!',
          color: 'from-amber-500 to-orange-600',
          bgColor: 'bg-amber-500/20',
          borderColor: 'border-amber-400',
          description: 'Declared win'
        };
    }
  };

  if (!isVisible) return null;

  const config = getActionConfig(action);
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop - lighter for claims */}
      <div 
        className={`absolute inset-0 transition-opacity duration-200 ${
          action === 'win' ? 'bg-black/40' : 'bg-black/20'
        } ${isAnimating ? 'opacity-100' : 'opacity-0'}`} 
      />
      
      {/* Action Card - smaller for claims */}
      <div 
        className={`relative transform transition-all duration-300 ${
          isAnimating 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        <div className={`
          ${config.bgColor} ${config.borderColor} backdrop-blur-sm 
          border-2 rounded-2xl shadow-2xl
          ${action === 'win' ? 'p-6 sm:p-8 max-w-md' : 'p-4 sm:p-6 max-w-sm'} mx-4
        `}>
          {/* Icon and Action - smaller for claims */}
          <div className="text-center mb-3">
            <div className={`
              ${action === 'win' ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-14 sm:h-14'} 
              mx-auto mb-3 rounded-full 
              bg-gradient-to-br ${config.color} 
              flex items-center justify-center shadow-lg
              ${isAnimating && action !== 'win' ? 'animate-pulse' : ''}
            `}>
              <IconComponent className={`${action === 'win' ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-6 h-6 sm:w-7 sm:h-7'} text-white`} />
            </div>
            
            <h2 className={`font-bold text-white mb-2 ${action === 'win' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
              {config.label}
            </h2>
            
            <p className={`text-emerald-200 ${action === 'win' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
              {config.description}
            </p>
          </div>

          {/* Player Name - smaller for claims */}
          <div className="text-center mb-4">
            <div className="bg-white/10 rounded-lg px-3 py-1.5 inline-block">
              <p className={`text-white font-medium ${action === 'win' ? 'text-lg' : 'text-base'}`}>
                {playerName}
              </p>
            </div>
          </div>

          {/* Tiles Display - more compact for claims */}
          {tiles.length > 0 && (
            <div className="text-center">
              <p className={`text-emerald-200 mb-2 ${action === 'win' ? 'text-sm' : 'text-xs'}`}>
                Tiles involved:
              </p>
              <div className="flex justify-center items-center gap-1 flex-wrap">
                {tiles.map((tile, index) => (
                  <div 
                    key={index}
                    className={`transform transition-all duration-200 ${
                      isAnimating && action !== 'win' ? 'animate-bounce' : ''
                    }`}
                    style={{ 
                      animationDelay: `${index * 50}ms`, // Faster animation
                      animationDuration: action === 'win' ? '1s' : '0.6s'
                    }}
                  >
                    <TileComponent
                      tile={tile}
                      height="compact"
                      className="shadow-lg border-2 border-white/30 hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
              
              {/* Action Type Explanation - smaller text for claims */}
              <div className={`mt-3 text-emerald-300 ${action === 'win' ? 'text-xs' : 'text-[10px]'}`}>
                {action === 'chow' && tiles.length >= 3 && (
                  <p>Sequence: {tiles.map(t => t.unicode).join(' → ')}</p>
                )}
                {action === 'pung' && tiles.length >= 3 && (
                  <p>Triplet: Three {tiles[0].unicode} tiles</p>
                )}
                {action === 'kong' && tiles.length >= 4 && (
                  <p>Quad: Four {tiles[0].unicode} tiles</p>
                )}
                {action === 'win' && (
                  <p>Winning hand completed!</p>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar - faster for claims */}
          <div className={`${action === 'win' ? 'mt-6' : 'mt-4'}`}>
            <div className="w-full bg-white/20 rounded-full h-1">
              <div 
                className={`bg-gradient-to-r ${config.color} h-1 rounded-full transition-all ease-linear ${
                  isAnimating ? 'w-0' : 'w-full'
                }`}
                style={{ 
                  animation: isAnimating ? `progress ${actualDuration}ms linear` : 'none' 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default BotActionIndicator;
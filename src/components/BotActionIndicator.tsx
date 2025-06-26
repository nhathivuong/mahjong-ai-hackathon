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
  duration = 3000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

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
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`} 
      />
      
      {/* Action Card */}
      <div 
        className={`relative transform transition-all duration-500 ${
          isAnimating 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-4'
        }`}
      >
        <div className={`
          ${config.bgColor} ${config.borderColor} backdrop-blur-sm 
          border-2 rounded-2xl p-6 sm:p-8 max-w-md mx-4
          shadow-2xl
        `}>
          {/* Icon and Action */}
          <div className="text-center mb-4">
            <div className={`
              w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full 
              bg-gradient-to-br ${config.color} 
              flex items-center justify-center shadow-lg
              ${isAnimating ? 'animate-pulse' : ''}
            `}>
              <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {config.label}
            </h2>
            
            <p className="text-emerald-200 text-sm sm:text-base">
              {config.description}
            </p>
          </div>

          {/* Player Name */}
          <div className="text-center mb-6">
            <div className="bg-white/10 rounded-lg px-4 py-2 inline-block">
              <p className="text-white font-medium text-lg">
                {playerName}
              </p>
            </div>
          </div>

          {/* Full Tiles Display */}
          {tiles.length > 0 && (
            <div className="text-center">
              <p className="text-emerald-200 text-sm mb-3">Tiles involved:</p>
              <div className="flex justify-center items-center gap-2 flex-wrap">
                {tiles.map((tile, index) => (
                  <div 
                    key={index}
                    className={`transform transition-all duration-300 ${
                      isAnimating ? 'animate-bounce' : ''
                    }`}
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animationDuration: '1s'
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
              
              {/* Action Type Explanation */}
              <div className="mt-4 text-xs text-emerald-300">
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

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div 
                className={`bg-gradient-to-r ${config.color} h-1.5 rounded-full transition-all duration-${duration} ease-linear ${
                  isAnimating ? 'w-0' : 'w-full'
                }`}
                style={{ 
                  animation: isAnimating ? `progress ${duration}ms linear` : 'none' 
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
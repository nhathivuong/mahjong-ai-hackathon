import React from 'react';
import { Tile } from '../types/mahjong';

interface TileComponentProps {
  tile: Tile;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  isDrawn?: boolean;
}

const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  isSelected = false,
  onClick,
  className = '',
  isDrawn = false
}) => {
  const getTileDisplay = (tile: Tile): { symbol: string; color: string; bg: string; subtext?: string } => {
    switch (tile.type) {
      case 'bamboo':
        return {
          symbol: tile.value?.toString() || '',
          subtext: '🎋',
          color: 'text-green-700',
          bg: 'bg-gradient-to-b from-green-50 to-green-100'
        };
      case 'character':
        return {
          symbol: tile.unicode,
          color: 'text-red-700',
          bg: 'bg-gradient-to-b from-red-50 to-red-100'
        };
      case 'dot':
        return {
          symbol: tile.value?.toString() || '',
          subtext: tile.unicode,
          color: 'text-blue-700',
          bg: 'bg-gradient-to-b from-blue-50 to-blue-100'
        };
      case 'dragon':
        return {
          symbol: tile.unicode,
          color: tile.dragon === 'red' ? 'text-red-600' : 
                 tile.dragon === 'green' ? 'text-green-600' : 'text-gray-700',
          bg: tile.dragon === 'red' ? 'bg-gradient-to-b from-red-50 to-red-100' : 
              tile.dragon === 'green' ? 'bg-gradient-to-b from-green-50 to-green-100' : 
              'bg-gradient-to-b from-gray-50 to-gray-100'
        };
      case 'wind':
        return {
          symbol: tile.unicode,
          color: 'text-purple-700',
          bg: 'bg-gradient-to-b from-purple-50 to-purple-100'
        };
      default:
        return { symbol: '?', color: 'text-gray-800', bg: 'bg-white' };
    }
  };

  const { symbol, color, bg, subtext } = getTileDisplay(tile);

  return (
    <div
      onClick={onClick}
      className={`
        w-16 h-20 ${bg} rounded-lg border-2 border-gray-300 shadow-md
        flex flex-col items-center justify-center cursor-pointer
        transition-all duration-200 hover:scale-105 hover:shadow-lg
        ${isSelected ? 'border-amber-500 bg-amber-100 transform -translate-y-3 shadow-xl' : ''}
        ${isDrawn ? 'border-blue-400 bg-blue-50 shadow-lg' : ''}
        ${onClick ? 'hover:border-amber-400' : ''}
        ${className}
      `}
    >
      <span className={`text-2xl font-bold ${color} leading-none`}>
        {symbol}
      </span>
      {subtext && (
        <span className={`text-xs ${color} mt-1`}>
          {subtext}
        </span>
      )}
    </div>
  );
};

export default TileComponent;
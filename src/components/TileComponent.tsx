import React from 'react';
import { Tile } from '../types/mahjong';

interface TileComponentProps {
  tile: Tile;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  isDrawn?: boolean;
  height?: 'normal' | 'compact'; // New prop for height control
}

const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  isSelected = false,
  onClick,
  className = '',
  isDrawn = false,
  height = 'normal'
}) => {
  const getTileDisplay = (tile: Tile): { 
    symbol: string; 
    color: string; 
    bg: string; 
    subtext?: string;
    label?: string;
  } => {
    switch (tile.type) {
      case 'bamboo':
        return {
          symbol: tile.value?.toString() || '',
          subtext: '🎋',
          // No label needed - bamboo tiles are clear with number and bamboo icon
          color: 'text-green-700',
          bg: 'bg-gradient-to-b from-green-50 to-green-100'
        };
      case 'character':
        return {
          symbol: tile.unicode,
          label: tile.value?.toString() || '', // Keep numeric indicator for Chinese characters
          color: 'text-red-700',
          bg: 'bg-gradient-to-b from-red-50 to-red-100'
        };
      case 'dot':
        const dotPatterns = {
          1: '●',
          2: '●●',
          3: '●●●',
          4: '●●\n●●',
          5: '●●\n●\n●●',
          6: '●●●\n●●●',
          7: '●●●\n●\n●●●',
          8: '●●●\n●●\n●●●',
          9: '●●●\n●●●\n●●●'
        };
        return {
          symbol: tile.value?.toString() || '',
          subtext: dotPatterns[tile.value as keyof typeof dotPatterns] || '●',
          // No label needed - dots are self-explanatory
          color: 'text-blue-700',
          bg: 'bg-gradient-to-b from-blue-50 to-blue-100'
        };
      case 'dragon':
        return {
          symbol: tile.unicode,
          // No label needed - dragon symbols are distinctive
          color: tile.dragon === 'red' ? 'text-red-600' : 
                 tile.dragon === 'green' ? 'text-green-600' : 'text-gray-700',
          bg: tile.dragon === 'red' ? 'bg-gradient-to-b from-red-50 to-red-100' : 
              tile.dragon === 'green' ? 'bg-gradient-to-b from-green-50 to-green-100' : 
              'bg-gradient-to-b from-gray-50 to-gray-100'
        };
      case 'wind':
        const windLabels = {
          east: 'E',
          south: 'S',
          west: 'W',
          north: 'N'
        };
        return {
          symbol: tile.unicode,
          label: windLabels[tile.wind as keyof typeof windLabels], // Keep direction indicators
          color: 'text-purple-700',
          bg: 'bg-gradient-to-b from-purple-50 to-purple-100'
        };
      default:
        return { symbol: '?', color: 'text-gray-800', bg: 'bg-white' };
    }
  };

  const { symbol, color, bg, subtext, label } = getTileDisplay(tile);

  // Fixed height for compact tiles - using h-[38px] for exact pixel control
  const heightClass = height === 'compact' ? 'h-[38px]' : 'h-20';
  const widthClass = height === 'compact' ? 'w-[30px]' : 'w-16';
  
  // Different border radius for compact vs normal tiles - using rounded-md for compact
  const borderRadiusClass = height === 'compact' ? 'rounded-md' : 'rounded-lg';
  
  // Adjust text sizes for compact tiles
  const symbolSize = height === 'compact' ? 'text-xs' : 'text-lg';
  const subtextSize = height === 'compact' ? 'text-[8px]' : 'text-[10px]';
  const labelSize = height === 'compact' ? 'text-[6px]' : 'text-[8px]';

  return (
    <div
      onClick={onClick}
      className={`
        ${widthClass} ${heightClass} ${bg} ${borderRadiusClass} border-2 border-gray-300 shadow-md
        flex flex-col items-center justify-center cursor-pointer relative overflow-hidden
        transition-all duration-200 hover:scale-105 hover:shadow-lg
        ${isSelected ? 'border-amber-500 bg-amber-100 transform -translate-y-3 shadow-xl' : ''}
        ${isDrawn ? 'border-blue-400 bg-blue-50 shadow-lg' : ''}
        ${onClick ? 'hover:border-amber-400' : ''}
        ${className}
      `}
    >
      {/* Main symbol - adjusted sizing for better fit */}
      <span className={`${symbolSize} font-bold ${color} leading-none flex-shrink-0`}>
        {symbol}
      </span>
      
      {/* Subtext (bamboo icon or dot pattern) - better contained */}
      {subtext && (
        <div className={`${subtextSize} ${color} text-center leading-none whitespace-pre-line flex-shrink-0 max-w-full overflow-hidden`}>
          {subtext}
        </div>
      )}
      
      {/* Label - only for Chinese characters and directions (wind) */}
      {label && height !== 'compact' && (
        <div className={`absolute bottom-0 right-0 bg-white/90 text-gray-700 ${labelSize} px-1 py-0.5 rounded-tl border-l border-t border-gray-300 font-medium leading-none`}>
          {label}
        </div>
      )}
    </div>
  );
};

export default TileComponent;
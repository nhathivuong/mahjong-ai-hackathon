import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import GameBoard from './GameBoard';

const GamePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
          <h1 className="text-2xl font-bold text-white">Play vs Bot</h1>
          <div></div>
        </div>
      </div>

      {/* Game Content */}
      <GameBoard gameMode="bot" />

      {/* Official Bolt.new Badge - Fixed Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        <a 
          href="https://bolt.new" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block hover:scale-105 transition-transform duration-200"
        >
          <img 
            src="/logotext_poweredby_360w copy.png" 
            alt="Powered by Bolt.new" 
            className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity duration-200"
          />
        </a>
      </div>
    </div>
  );
};

export default GamePage;
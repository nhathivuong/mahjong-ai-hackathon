import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, BookOpen, Sparkles } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-4 mr-4">
              <Sparkles className="w-12 h-12 text-amber-400" />
            </div>
            <h1 className="text-6xl font-bold text-white">
              麻將
              <span className="block text-2xl font-normal text-emerald-200 mt-2">
                Chinese Mahjong
              </span>
            </h1>
          </div>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Experience the classic tile-matching game with beautiful graphics, 
            intelligent AI, and authentic Chinese Mahjong rules.
          </p>
        </div>

        {/* Main Game Option */}
        <div className="flex justify-center mb-12">
          <div
            onClick={() => navigate('/game/bot')}
            className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 max-w-md"
          >
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-12 h-full hover:bg-white/20 transition-all duration-300">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 mx-auto">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 text-center">
                Play Mahjong
              </h3>
              <p className="text-emerald-100 leading-relaxed text-center text-lg">
                Challenge our intelligent AI opponents in authentic Chinese Mahjong. 
                Perfect your strategy and master the ancient game!
              </p>
              <div className="mt-8 flex items-center justify-center text-amber-400 font-medium group-hover:text-amber-300 transition-colors text-lg">
                Start Playing
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Button */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/rules')}
            className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <BookOpen className="w-5 h-5 mr-3" />
            Learn the Rules
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-amber-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-400/20 rounded-full blur-xl"></div>
      </div>

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

export default HomePage;
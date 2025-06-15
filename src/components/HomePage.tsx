import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Users, Monitor, BookOpen, Sparkles } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const gameOptions = [
    {
      id: 'bot',
      title: 'Play vs Bot',
      description: 'Challenge our intelligent AI opponent',
      icon: Bot,
      gradient: 'from-amber-500 to-orange-600',
      path: '/game/bot'
    },
    {
      id: 'online',
      title: 'Online Multiplayer',
      description: 'Play with friends around the world',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-600',
      path: '/game/online'
    },
    {
      id: 'local',
      title: 'Local Game',
      description: 'Play with friends on the same device',
      icon: Monitor,
      gradient: 'from-purple-500 to-pink-600',
      path: '/game/local'
    }
  ];

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
            intelligent AI, and multiplayer capabilities.
          </p>
        </div>

        {/* Game Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {gameOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.id}
                onClick={() => navigate(option.path)}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
              >
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 h-full hover:bg-white/20 transition-all duration-300">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {option.title}
                  </h3>
                  <p className="text-emerald-100 leading-relaxed">
                    {option.description}
                  </p>
                  <div className="mt-6 flex items-center text-amber-400 font-medium group-hover:text-amber-300 transition-colors">
                    Start Playing
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rules Button */}
        <div className="text-center">
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
    </div>
  );
};

export default HomePage;
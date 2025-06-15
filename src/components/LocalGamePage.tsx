import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Users, RotateCcw } from 'lucide-react';

const LocalGamePage: React.FC = () => {
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
          <h1 className="text-2xl font-bold text-white">Local Multiplayer</h1>
          <div></div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-12">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Monitor className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">Coming Soon!</h2>
            <p className="text-emerald-100 text-lg mb-8 leading-relaxed">
              Local multiplayer mode is being developed where you can pass the device 
              between players or play on the same screen with friends and family!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 rounded-xl p-4">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h3 className="text-white font-medium mb-2">Pass & Play</h3>
                <p className="text-emerald-200 text-sm">Take turns on the same device</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <Monitor className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                <h3 className="text-white font-medium mb-2">Split Screen</h3>
                <p className="text-emerald-200 text-sm">Multiple players on one screen</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <RotateCcw className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-white font-medium mb-2">Hot Seat</h3>
                <p className="text-emerald-200 text-sm">Classic turn-based gameplay</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/game/bot')}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg mr-4"
              >
                Play vs Bot Instead
              </button>
              <button
                onClick={() => navigate('/rules')}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Learn the Rules
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalGamePage;
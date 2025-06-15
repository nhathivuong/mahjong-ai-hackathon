import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Target, Trophy, Shuffle } from 'lucide-react';

const RulesPage: React.FC = () => {
  const navigate = useNavigate();

  const rulesSections = [
    {
      icon: Users,
      title: 'Game Setup',
      content: [
        'Chinese Mahjong is played with 4 players using 144 tiles',
        'Each player starts with 13 tiles, with one player having 14 tiles',
        'The goal is to form a complete hand with 4 sets and 1 pair',
        'Sets can be sequences (3 consecutive tiles) or triplets (3 identical tiles)'
      ]
    },
    {
      icon: Shuffle,
      title: 'Tile Types',
      content: [
        'Bamboo (條): Numbers 1-9 represented by bamboo sticks',
        'Characters (萬): Numbers 1-9 in Chinese characters',
        'Dots (筒): Numbers 1-9 represented by circular dots',
        'Honor tiles: Dragons (Red, Green, White) and Winds (East, South, West, North)',
        'Each tile appears 4 times in the set (except flowers and seasons)'
      ]
    },
    {
      icon: Target,
      title: 'How to Play',
      content: [
        'Players take turns drawing and discarding tiles',
        'You can claim discarded tiles to complete sets (Chow, Pung, Kong)',
        'Chow: Sequence of 3 tiles from the previous player only',
        'Pung: 3 identical tiles from any player',
        'Kong: 4 identical tiles, can be concealed or exposed',
        'The first player to complete their hand wins the round'
      ]
    },
    {
      icon: Trophy,
      title: 'Winning Conditions',
      content: [
        'A winning hand consists of 4 sets + 1 pair (14 tiles total)',
        'Special hands like "Thirteen Orphans" or "Seven Pairs" are also valid',
        'You must declare "Mahjong" when you have a winning hand',
        'Scoring is based on the difficulty and type of winning hand',
        'The game continues for multiple rounds with rotating dealer positions'
      ]
    }
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300 mr-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
          <h1 className="text-4xl font-bold text-white">Mahjong Rules</h1>
        </div>

        {/* Introduction */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to Chinese Mahjong</h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Chinese Mahjong is a tile-based game that originated in China and is commonly played by four players. 
            The game involves skill, strategy, and chance, with the objective being to complete a legal hand using 
            the 14th drawn tile to form four sets and one pair.
          </p>
        </div>

        {/* Rules Sections */}
        <div className="space-y-6">
          {rulesSections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{section.title}</h3>
                </div>
                <ul className="space-y-3">
                  {section.content.map((rule, ruleIndex) => (
                    <li
                      key={ruleIndex}
                      className="flex items-start text-emerald-100"
                    >
                      <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Tile Examples */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mt-8">
          <h3 className="text-xl font-bold text-white mb-6">Example Tiles</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-green-600 mb-2 mx-auto">
                🀐
              </div>
              <p className="text-emerald-100 text-sm">Bamboo 1</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-red-600 mb-2 mx-auto">
                🀀
              </div>
              <p className="text-emerald-100 text-sm">Character 1</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-blue-600 mb-2 mx-auto">
                🀙
              </div>
              <p className="text-emerald-100 text-sm">Dot 1</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-red-500 mb-2 mx-auto">
                🀄
              </div>
              <p className="text-emerald-100 text-sm">Red Dragon</p>
            </div>
          </div>
        </div>

        {/* Start Playing CTA */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/game/bot')}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Start Playing Now
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
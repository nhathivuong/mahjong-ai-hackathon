import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Target, Trophy, Shuffle, Zap, Eye } from 'lucide-react';

const RulesPage: React.FC = () => {
  const navigate = useNavigate();

  const rulesSections = [
    {
      icon: Users,
      title: 'Game Setup',
      content: [
        'Play against 3 intelligent AI opponents in this 4-player Chinese Mahjong game',
        'Each player starts with 13 tiles, with the dealer (you) receiving 14 tiles to begin',
        'The goal is to form a complete winning hand with 4 sets and 1 pair (14 tiles total)',
        'Sets can be sequences (3 consecutive tiles) or triplets/quads (3-4 identical tiles)'
      ]
    },
    {
      icon: Shuffle,
      title: 'Tile Types & Display',
      content: [
        'Bamboo (條): Numbers 1-9 with bamboo stick symbols',
        'Characters (萬): Chinese numerals 一二三四五六七八九',
        'Dots (筒): Numbers 1-9 represented by dot patterns',
        'Dragons: Red (中), Green (發), White (白)',
        'Winds: East (東), South (南), West (西), North (北)',
        'Each tile type appears 4 times in the complete set (144 tiles total)'
      ]
    },
    {
      icon: Target,
      title: 'How to Play',
      content: [
        'Click tiles in your hand to select them, then click "Discard Selected Tile"',
        'When opponents discard tiles, you can claim them to complete sets',
        'Chow: Sequence of 3 consecutive tiles',
        'Pung: 3 identical tiles',
        'Kong: 4 identical tiles (draws replacement tile)',
        'Priority: Win > Kong > Pung > Chow (higher priority claims override lower ones)'
      ]
    },
    {
      icon: Eye,
      title: 'Game Interface Features',
      content: [
        'Your tiles are displayed at the bottom with clear visibility',
        'Opponent hands are hidden (face-down tiles) but exposed sets are visible',
        'Central discard area shows the most recent discarded tile',
        'Click player names in discard history to see their full discard grid',
        'Turn indicator shows whose turn it is with visual highlighting',
        'Wall counter displays remaining tiles in the draw pile'
      ]
    },
    {
      icon: Zap,
      title: 'Special Actions & Claims',
      content: [
        'When you can claim a discarded tile, a popup will show your options',
        'Win claims have highest priority - you can win by claiming any tile that completes your hand',
        'Kong automatically draws a replacement tile from the wall',
        'Bot actions are displayed with animated indicators showing what they claimed',
        'The game automatically handles claim priority and turn order',
        'Simply choose from the available options when the claim popup appears'
      ]
    },
    {
      icon: Trophy,
      title: 'Winning & Scoring',
      content: [
        'Declare "Mahjong" when you have a winning hand (button appears automatically)',
        'Standard winning hand: 4 sets + 1 pair = 14 tiles total',
        'Special hands: Seven Pairs (7 different pairs) or Thirteen Orphans',
        'Self-drawn wins (drawing your own winning tile) score higher than claimed wins',
        'Kongs provide significant scoring bonuses, especially concealed ones',
        'Game ends when someone wins or the wall is exhausted (draw condition)'
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
          <h1 className="text-4xl font-bold text-white">How to Play</h1>
        </div>

        {/* Introduction */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to Chinese Mahjong</h2>
          <p className="text-emerald-100 text-lg leading-relaxed mb-4">
            This implementation of Chinese Mahjong features intelligent AI opponents, authentic tile designs, 
            and a clean interface optimized for both desktop and mobile play. The game follows traditional 
            Chinese Mahjong rules with modern conveniences.
          </p>
          <div className="bg-amber-500/20 border border-amber-400/50 rounded-lg p-4">
            <p className="text-amber-100 text-sm">
              <strong>💡 Pro Tip:</strong> The game automatically detects when you can win and shows a "Declare Mahjong" button. 
              Pay attention to claim popups when opponents discard tiles - you might be able to complete your hand!
            </p>
          </div>
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

        {/* Game Controls Guide */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mt-8">
          <h3 className="text-xl font-bold text-white mb-6">Game Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-amber-400 mb-3">Your Turn</h4>
              <ul className="space-y-2 text-emerald-100">
                <li>• Click any tile in your hand to select it</li>
                <li>• Click "Discard Selected Tile" to play it</li>
                <li>• Click "Declare Mahjong" when you can win</li>
                <li>• Selected tiles are highlighted and lifted up</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-400 mb-3">Claiming Tiles</h4>
              <ul className="space-y-2 text-emerald-100">
                <li>• Claim popups appear automatically when possible</li>
                <li>• Choose from available options (Chow, Pung, Kong, Win)</li>
                <li>• Click "Skip" if you don't want to claim</li>
                <li>• Win claims always take priority over other claims</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tile Examples */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mt-8">
          <h3 className="text-xl font-bold text-white mb-6">Tile Examples</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-12 h-16 bg-gradient-to-b from-green-50 to-green-100 rounded-lg flex flex-col items-center justify-center text-green-700 font-bold mb-2 mx-auto border-2 border-gray-300">
                <span className="text-xs">1</span>
                <span className="text-[8px]">🎋</span>
              </div>
              <p className="text-emerald-100 text-sm">Bamboo 1</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-gradient-to-b from-red-50 to-red-100 rounded-lg flex items-center justify-center text-red-700 font-bold mb-2 mx-auto border-2 border-gray-300">
                <span className="text-lg">一</span>
              </div>
              <p className="text-emerald-100 text-sm">Character 1</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg flex flex-col items-center justify-center text-blue-700 font-bold mb-2 mx-auto border-2 border-gray-300">
                <span className="text-xs">1</span>
                <span className="text-[8px]">●</span>
              </div>
              <p className="text-emerald-100 text-sm">Dot 1</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-gradient-to-b from-red-50 to-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold mb-2 mx-auto border-2 border-gray-300">
                <span className="text-lg">中</span>
              </div>
              <p className="text-emerald-100 text-sm">Red Dragon</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-16 bg-gradient-to-b from-purple-50 to-purple-100 rounded-lg flex items-center justify-center text-purple-700 font-bold mb-2 mx-auto border-2 border-gray-300">
                <span className="text-lg">東</span>
              </div>
              <p className="text-emerald-100 text-sm">East Wind</p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/50 rounded-2xl p-8 mt-8">
          <h3 className="text-xl font-bold text-white mb-4">Quick Start Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">1</div>
              <p className="text-amber-100">Start the game and examine your 14 tiles</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">2</div>
              <p className="text-amber-100">Select and discard tiles you don't need</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">3</div>
              <p className="text-amber-100">Claim tiles to complete sets and win!</p>
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

export default RulesPage;
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import HomePage from './components/HomePage';
import GamePage from './components/GamePage';
import RulesPage from './components/RulesPage';

function App() {
  const [isLandscape, setIsLandscape] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;
      
      // Detect if device is mobile/tablet based on screen size and touch capability
      const isMobileDevice = width <= 1024 && 'ontouchstart' in window;
      setIsMobile(isMobileDevice);
      
      // For mobile devices, enforce landscape (width > height)
      // For desktop, always allow (assume landscape-friendly)
      if (isMobileDevice) {
        setIsLandscape(aspectRatio >= 1.0); // Landscape when width >= height
      } else {
        setIsLandscape(true); // Desktop is always considered "landscape-ready"
      }
    };

    // Check orientation on mount
    checkOrientation();

    // Listen for orientation/resize changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure orientation change is complete
      setTimeout(checkOrientation, 100);
    });

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Show orientation prompt only for mobile devices in portrait mode
  if (isMobile && !isLandscape) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 flex items-center justify-center p-4 z-50">
        <div className="text-center max-w-sm mx-auto">
          {/* Animated rotation icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-white/20 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-12 h-12 text-white animate-pulse" />
              </div>
              {/* Rotation indicator */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-sm font-bold">↻</span>
              </div>
            </div>
          </div>

          {/* Main message */}
          <h1 className="text-2xl font-bold text-white mb-4">
            Rotate Your Device
          </h1>
          
          <p className="text-emerald-100 text-lg mb-6 leading-relaxed">
            Please rotate your device to landscape mode for the best Mahjong experience.
          </p>

          {/* Visual device representation */}
          <div className="flex justify-center items-center space-x-4 mb-6">
            {/* Portrait device (current) */}
            <div className="relative">
              <div className="w-12 h-20 border-2 border-red-400 rounded-lg bg-red-400/20"></div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-red-400 text-xs font-medium">
                Portrait
              </div>
            </div>

            {/* Arrow */}
            <div className="text-white text-2xl animate-pulse">→</div>

            {/* Landscape device (target) */}
            <div className="relative">
              <div className="w-20 h-12 border-2 border-green-400 rounded-lg bg-green-400/20"></div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-green-400 text-xs font-medium">
                Landscape
              </div>
            </div>
          </div>

          {/* Additional help text */}
          <div className="text-emerald-200 text-sm">
            <p className="mb-2">🎮 Better tile visibility</p>
            <p className="mb-2">🀄 Optimal game layout</p>
            <p>📱 Enhanced touch controls</p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-16 h-16 bg-amber-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-20 h-20 bg-cyan-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-pink-400/20 rounded-full blur-xl animate-pulse"></div>
      </div>
    );
  }

  // Render the main app when in landscape or on desktop
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/bot" element={<GamePage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
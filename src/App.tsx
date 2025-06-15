import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import GamePage from './components/GamePage';
import RulesPage from './components/RulesPage';
import OnlineGamePage from './components/OnlineGamePage';
import LocalGamePage from './components/LocalGamePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/bot" element={<GamePage />} />
          <Route path="/game/online" element={<OnlineGamePage />} />
          <Route path="/game/local" element={<LocalGamePage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import { AppScreen, Message } from './types';
import Home from './components/Home';
import Generator from './components/Generator';
import { INITIAL_CREDITS, UPDATE_COST } from './constants';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('murodjon_ai_credits');
    return saved ? parseInt(saved, 10) : INITIAL_CREDITS;
  });
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  useEffect(() => {
    localStorage.setItem('murodjon_ai_credits', credits.toString());
  }, [credits]);

  const handleStartGeneration = useCallback((prompt: string) => {
    setInitialPrompt(prompt);
    setChatHistory([{ role: 'user', content: prompt }]);
    setScreen(AppScreen.GENERATOR);
  }, []);

  const handleUpdateCredits = useCallback(() => {
    setCredits(prev => Math.max(0, prev - UPDATE_COST));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col">
      {screen === AppScreen.HOME ? (
        <Home onStart={handleStartGeneration} credits={credits} />
      ) : (
        <Generator 
          initialPrompt={initialPrompt} 
          credits={credits} 
          onUpdateCredits={handleUpdateCredits}
          history={chatHistory}
          setHistory={setChatHistory}
        />
      )}

      {/* Persistent Branding */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-indigo-100 flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Creator</span>
          <span className="text-sm font-extrabold text-slate-800">MURODJON AI</span>
        </div>
      </div>
    </div>
  );
};

export default App;

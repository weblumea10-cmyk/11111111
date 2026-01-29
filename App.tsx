
import React, { useState, useEffect, useCallback } from 'react';
import { AppScreen, Message } from './types.ts';
import Home from './components/Home.tsx';
import Generator from './components/Generator.tsx';
import Logo from './components/Logo.tsx';
import { INITIAL_CREDITS, UPDATE_COST } from './constants.ts';

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
      <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); setScreen(AppScreen.HOME); }}
          className="group bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 hover:shadow-indigo-500/10"
        >
          <Logo size="sm" showText={true} />
        </a>
      </div>
    </div>
  );
};

export default App;

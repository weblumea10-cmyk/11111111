
import React, { useState, useEffect } from 'react';
import Logo from './Logo.tsx';

const MESSAGES = [
  "Dizayn arxitekturasi tahlil qilinmoqda...",
  "Tailwind CSS uslublari biriktirilmoqda...",
  "SEO va Meta-ma'lumotlar optimallashmoqda...",
  "Responsive dizayn qoidalari o'rnatilmoqda...",
  "Murodjon AI kreativlik qo'shmoqda...",
  "Rasm va kontent joylashtirilmoqda...",
  "Toza kod strukturasi yaratilmoqda...",
  "Yakuniy sayt tayyorlanmoqda..."
];

const GenerationLoader: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg text-center px-6">
        {/* Animated Logo */}
        <div className="mb-12 animate-bounce">
          <Logo size="xl" showText={false} theme="light" />
        </div>

        {/* Shimmering Brand Name */}
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          MURODJON <span className="text-indigo-400">AI</span>
        </h2>
        
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mb-8"></div>

        {/* Dynamic Status Messages */}
        <div className="space-y-4">
          <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
            GENERATING MASTERPIECE
          </p>
          <div className="h-10 flex items-center justify-center">
            <p key={msgIndex} className="text-xl md:text-2xl text-slate-100 font-medium animate-in fade-in slide-in-from-right-4 duration-500">
              {MESSAGES[msgIndex]}
            </p>
          </div>
        </div>

        {/* Stylized Progress Bar */}
        <div className="mt-12 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_2s_infinite] w-[200%]"></div>
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-50%); }
              100% { transform: translateX(0%); }
            }
          `}</style>
        </div>

        {/* Reassuring Footer */}
        <p className="mt-8 text-slate-500 text-xs font-bold uppercase tracking-widest">
          Siz uchun dunyodagi eng ilg'or AI ishlamoqda
        </p>
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
      <div className="absolute bottom-20 right-20 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-1/2 right-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
    </div>
  );
};

export default GenerationLoader;

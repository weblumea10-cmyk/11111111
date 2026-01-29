
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
}

const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = true, 
  size = 'md',
  theme = 'dark'
}) => {
  const sizes = {
    sm: { icon: 'h-6 w-6', text: 'text-sm' },
    md: { icon: 'h-8 w-8', text: 'text-lg' },
    lg: { icon: 'h-12 w-12', text: 'text-2xl' },
    xl: { icon: 'h-20 w-20', text: 'text-4xl' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${currentSize.icon} flex-shrink-0`}>
        {/* Glow effect for larger sizes */}
        {size === 'xl' && (
          <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
        )}
        
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 w-full h-full drop-shadow-md"
        >
          <path 
            d="M21 7L12 2L3 7V17L12 22L21 17V7Z" 
            className="fill-indigo-600"
          />
          <path 
            d="M12 22V12M12 12L3 7M12 12L21 7" 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="opacity-40"
          />
          <path 
            d="M7 9L12 12L17 9" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <circle cx="12" cy="12" r="2" fill="white" className="animate-pulse" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${currentSize.text} font-black tracking-tighter ${theme === 'dark' ? 'text-slate-900' : 'text-white'}`}>
            MURODJON <span className="text-indigo-600">AI</span>
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">
              Next-Gen Generator
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;

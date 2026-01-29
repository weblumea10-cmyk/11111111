
import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import Logo from './Logo.tsx';

interface HomeProps {
  onStart: (prompt: string) => void;
  credits: number;
}

const Home: React.FC<HomeProps> = ({ onStart, credits }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (credits < 30000) {
      alert("Not enough credits. Required: 30,000");
      return;
    }
    onStart(prompt);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (credits < 30000) {
      alert("Not enough credits to import files.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingFile(true);
    let extractedContent = '';

    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = new JSZip();
        const arrayBuffer = await file.arrayBuffer();
        const contents = await zip.loadAsync(arrayBuffer);
        
        const htmlFiles = (Object.values(contents.files) as any[]).filter(f => 
          !f.dir && 
          f.name.toLowerCase().endsWith('.html') && 
          !f.name.includes('__MACOSX')
        );
        
        if (htmlFiles.length > 0) {
          const sorted = htmlFiles.sort((a, b) => {
            const aIsIndex = a.name.toLowerCase().includes('index.html');
            const bIsIndex = b.name.toLowerCase().includes('index.html');
            if (aIsIndex && !bIsIndex) return -1;
            if (!aIsIndex && bIsIndex) return 1;
            return a.name.split('/').length - b.name.split('/').length;
          });
          
          extractedContent = await sorted[0].async('string');
        } else {
          throw new Error('No valid HTML files found in the ZIP archive.');
        }
      } else if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.txt')) {
        extractedContent = await file.text();
      } else {
        throw new Error('Unsupported file format. Please upload .html or .zip');
      }

      if (!extractedContent.trim()) {
        throw new Error('The uploaded file is empty.');
      }

      const recreationPrompt = `I am uploading a file named ${file.name}. Here is its content: 
      ---
      ${extractedContent}
      ---
      Please recreate this exact website/app using Tailwind CSS and modern best practices. Ensure the functionality and design are preserved.`;

      onStart(recreationPrompt);
    } catch (err: any) {
      console.error("File processing error:", err);
      alert(`Error processing file: ${err.message}`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-3xl w-full space-y-12 text-center animate-in fade-in zoom-in duration-700 relative z-10">
        
        <div className="flex flex-col items-center space-y-6">
          <button 
            onClick={() => setShowBrandModal(true)}
            className="group relative transition-transform hover:scale-105 active:scale-95"
            title="View Brand Assets"
          >
            <Logo size="xl" showText={false} className="mb-2" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded text-[10px] font-bold text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ASSETS
            </div>
          </button>
          
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter">
              MURODJON <span className="text-indigo-600">AI</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
              Dunyodagi eng ilg'or AI veb-sayt generatori. Bir necha soniyada professional natijalar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative group max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl flex items-center p-2 border border-slate-200 ring-1 ring-slate-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-slate-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-indigo-50"
              title="Import HTML or ZIP"
              disabled={isProcessingFile}
            >
              {isProcessingFile ? (
                <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".html,.zip,.txt"
            />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Qanday sayt yaratmoqchisiz? (masalan: Restoran sayti...)"
              className="flex-1 px-4 py-5 text-lg bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 font-medium"
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim() || credits < 30000 || isProcessingFile}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-10 py-5 rounded-xl font-black transition-all flex items-center gap-2 disabled:opacity-30 shadow-lg"
            >
              YARATISH
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-8 pt-8">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Balans</span>
            <span className="text-xl font-bold text-slate-900">{credits.toLocaleString()}</span>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Narxi</span>
            <span className="text-xl font-bold text-indigo-600">30,000</span>
          </div>
        </div>
      </div>

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 relative animate-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={() => setShowBrandModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Logo size="lg" />
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Brand Assets</h3>
                  <p className="text-slate-500 text-sm">Official Murodjon AI identity elements.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-4">
                  <Logo size="xl" showText={false} />
                  <span className="text-xs font-bold text-slate-400">Master Icon</span>
                </div>
                <div className="p-6 bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-4">
                  <Logo size="xl" showText={false} theme="light" />
                  <span className="text-xs font-bold text-slate-500">Dark Theme Icon</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">SVG Code</h4>
                <pre className="text-[10px] bg-white p-4 rounded-lg border border-slate-200 overflow-x-auto text-slate-600">
{`<svg width="512" height="512" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 7L12 2L3 7V17L12 22L21 17V7Z" fill="#4F46E5"/>
  <path d="M12 22V12M12 12L3 7M12 12L21 7" stroke="white" stroke-width="1" opacity="0.4"/>
  <path d="M7 9L12 12L17 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="2" fill="white"/>
</svg>`}
                </pre>
              </div>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`<svg width="512" height="512" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 2L3 7V17L12 22L21 17V7Z" fill="#4F46E5"/><path d="M12 22V12M12 12L3 7M12 12L21 7" stroke="white" stroke-width="1" opacity="0.4"/><path d="M7 9L12 12L17 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="white"/></svg>`);
                  alert("SVG kodi nusxalandi!");
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
              >
                Copy SVG Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

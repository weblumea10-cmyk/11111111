
import React, { useState, useRef } from 'react';
import JSZip from 'jszip';

interface HomeProps {
  onStart: (prompt: string) => void;
  credits: number;
}

const Home: React.FC<HomeProps> = ({ onStart, credits }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || credits < 30000) return;
    onStart(prompt);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || credits < 30000) return;

    setIsProcessingFile(true);
    let extractedContent = '';

    try {
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        const htmlFiles = Object.keys(contents.files).filter(name => name.endsWith('.html'));
        if (htmlFiles.length > 0) {
          const mainFile = htmlFiles.find(name => name.toLowerCase().includes('index')) || htmlFiles[0];
          extractedContent = await contents.files[mainFile].async('string');
        } else {
          throw new Error('No HTML files found in the ZIP.');
        }
      } else if (file.name.endsWith('.html') || file.name.endsWith('.txt')) {
        extractedContent = await file.text();
      } else {
        throw new Error('Unsupported file format. Please upload .html or .zip');
      }

      const recreationPrompt = `I am uploading a file named ${file.name}. Here is its content: 
      ---
      ${extractedContent}
      ---
      Please recreate this exact website/app using Tailwind CSS and modern best practices. Ensure the functionality and design are preserved.`;

      onStart(recreationPrompt);
    } catch (err: any) {
      alert(`Error processing file: ${err.message}`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-3xl w-full space-y-8 text-center animate-in fade-in zoom-in duration-700">
        <div className="space-y-4">
          <div className="inline-block p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">
            Web Site <span className="text-indigo-600">Generator</span>
          </h1>
          <p className="text-xl text-slate-600 font-medium">
            Describe your dream website or upload an existing one to recreate it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-2xl shadow-xl flex items-center p-2 border border-slate-200">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Import HTML or ZIP"
              disabled={isProcessingFile}
            >
              {isProcessingFile ? (
                <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              placeholder="e.g. A luxury real estate landing page..."
              className="flex-1 px-4 py-4 text-lg bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim() || credits < 30000 || isProcessingFile}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Build Site
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-6 pt-8">
          <div className="text-slate-500 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Available Credits: <span className="text-slate-900 font-bold">{credits.toLocaleString()}</span>
          </div>
          <div className="w-px h-4 bg-slate-300"></div>
          <div className="text-slate-500 font-medium">
            Cost: <span className="text-indigo-600 font-bold">30,000 Credits</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

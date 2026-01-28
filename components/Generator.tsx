
import React, { useState, useRef, useEffect } from 'react';
import { Message, Project } from '../types';
import { generateWebsite } from '../services/geminiService';
import { publishToVercel } from '../services/vercelService';
import { MAX_PUBLISH_LIMIT } from '../constants';
import PreviewFrame from './PreviewFrame';
import CodeEditor from './CodeEditor';
import JSZip from 'jszip';

interface GeneratorProps {
  initialPrompt: string;
  credits: number;
  onUpdateCredits: () => void;
  history: Message[];
  setHistory: React.Dispatch<React.SetStateAction<Message[]>>;
}

type ViewMode = 'preview' | 'code';

const Generator: React.FC<GeneratorProps> = ({ initialPrompt, credits, onUpdateCredits, history, setHistory }) => {
  const [code, setCode] = useState<string>('');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isInitialBuild, setIsInitialBuild] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [publishCount, setPublishCount] = useState<number>(() => {
    const saved = localStorage.getItem('murodjon_publish_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('murodjon_publish_count', publishCount.toString());
  }, [publishCount]);

  useEffect(() => {
    const stored = localStorage.getItem('murodjon_projects');
    if (stored) {
      setSavedProjects(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (isInitialBuild && initialPrompt) {
      const performInitialBuild = async () => {
        setIsProcessing(true);
        try {
          const generatedCode = await generateWebsite(initialPrompt, []);
          setCode(generatedCode);
          setHistory(prev => [...prev, { role: 'assistant', content: 'Initial version created! What would you like to change?' }]);
          onUpdateCredits();
        } catch (err) {
          setHistory(prev => [...prev, { role: 'assistant', content: 'Error building initial site. Please check your connection and try again.' }]);
        } finally {
          setIsProcessing(false);
          setIsInitialBuild(false);
        }
      };
      performInitialBuild();
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSendMessage = async (text?: string) => {
    const userMessage = text || input.trim();
    if (!userMessage || isProcessing || credits < 30000) return;

    if (!text) setInput('');
    setIsProcessing(true);
    setDeployedUrl(null);
    
    setHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const updatedCode = await generateWebsite(
        `Update/Recreate the website based on this request: "${userMessage}". 
        Current Code Context: ${code.slice(0, 2000)}
        Return the FULL updated HTML code.`,
        history
      );
      
      setCode(updatedCode);
      setHistory(prev => [...prev, { role: 'assistant', content: 'Website updated based on your input/file!' }]);
      onUpdateCredits();
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
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

      setHistory(prev => [...prev, { role: 'user', content: `[Uploaded File: ${file.name}] Analyzing and recreating...` }]);
      
      const prompt = `I have uploaded a file named ${file.name}. Here is its content: 
      ---
      ${extractedContent}
      ---
      Please recreate this exact website/app using Tailwind CSS and modern best practices. Keep the functionality and design identical.`;

      const generatedCode = await generateWebsite(prompt, history);
      setCode(generatedCode);
      setHistory(prev => [...prev, { role: 'assistant', content: `I've analyzed ${file.name} and recreated it. Check the preview!` }]);
      onUpdateCredits();
    } catch (err: any) {
      setHistory(prev => [...prev, { role: 'assistant', content: `Error processing file: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualCodeChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      setCode(newValue);
      setDeployedUrl(null);
    }
  };

  const handlePublish = async () => {
    if (publishCount >= MAX_PUBLISH_LIMIT) {
      alert("You have reached your maximum limit of 15 publishes.");
      return;
    }

    setIsPublishing(true);
    try {
      const url = await publishToVercel(code);
      setDeployedUrl(url);
      setPublishCount(prev => prev + 1);
      setHistory(prev => [...prev, { role: 'assistant', content: `🚀 Website published successfully! View it live at: ${url}` }]);
    } catch (err) {
      alert("Publishing failed. Please try again later.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!code) return;
    try {
      const zip = new JSZip();
      zip.file("index.html", code);
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MURODJON AI PROJEKTS.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate ZIP:", err);
      alert("Failed to generate ZIP file.");
    }
  };

  const saveProject = () => {
    const name = prompt("Enter project name:", `Project ${new Date().toLocaleDateString()}`);
    if (!name) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name,
      code,
      history,
      timestamp: Date.now()
    };

    const updated = [...savedProjects, newProject];
    setSavedProjects(updated);
    localStorage.setItem('murodjon_projects', JSON.stringify(updated));
    alert("Project saved successfully!");
  };

  const loadProject = (project: Project) => {
    setCode(project.code);
    setHistory(project.history);
    setShowLoadModal(false);
    setIsInitialBuild(false);
    setDeployedUrl(null);
  };

  const deleteProject = (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    localStorage.setItem('murodjon_projects', JSON.stringify(updated));
  };

  const publishPercentage = (publishCount / MAX_PUBLISH_LIMIT) * 100;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <div className="w-full md:w-96 flex flex-col bg-slate-800 border-r border-slate-700 shadow-2xl z-20 animate-in slide-in-from-left duration-500">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
               </svg>
            </div>
            <h2 className="font-bold text-slate-100 uppercase tracking-wider text-xs">Design Chat</h2>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
              {credits.toLocaleString()} Credits
            </div>
            <div className="w-24 flex flex-col items-end">
              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">
                Publish: {publishCount}/{MAX_PUBLISH_LIMIT}
              </div>
              <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${publishCount >= MAX_PUBLISH_LIMIT ? 'bg-red-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${Math.min(100, publishPercentage)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          {history.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' 
                    : 'bg-slate-700 text-slate-100 rounded-tl-none border border-slate-600'
                }`}
              >
                {msg.content}
                {(msg.content.includes('View it here:') || msg.content.includes('View it live at:')) && (
                   <a 
                     href={msg.content.split(': ')[1]} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="block mt-2 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-center transition-colors border border-white/10 font-bold"
                   >
                     🚀 Open Live Website →
                   </a>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-slate-100 p-3 rounded-2xl rounded-tl-none border border-slate-600 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="space-y-3">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for changes or upload a file..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-12 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isInitialBuild && isProcessing}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-3 text-slate-400 hover:text-indigo-400 transition-colors"
                title="Upload HTML or ZIP"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".html,.zip,.txt"
              />
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                 30k Cr / Update
               </span>
              <button
                type="submit"
                disabled={isProcessing || !input.trim() || credits < 30000}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all transform active:scale-95"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col bg-white">
        <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4 justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Code
              </button>
            </div>
            {deployedUrl && viewMode === 'preview' ? (
              <a 
                href={deployedUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hidden lg:flex items-center gap-2 text-[10px] text-green-600 font-mono tracking-tight bg-green-50 border border-green-200 px-3 py-1 rounded hover:bg-green-100 transition-colors"
              >
                Live: {deployedUrl}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            ) : (
              <div className="hidden sm:block text-[10px] text-slate-400 font-mono tracking-tight bg-white border border-slate-300 px-3 py-1 rounded">
                {viewMode === 'preview' ? 'https://preview.murodjon-ai.xyz/' : 'Editor: index.html'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={saveProject}
              className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold hover:bg-slate-300 transition-colors flex items-center gap-2"
              title="Save Project"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Save
            </button>
            <button 
              onClick={() => setShowLoadModal(true)}
              className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold hover:bg-slate-300 transition-colors flex items-center gap-2"
              title="Load Project"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Load
            </button>
            <button 
              onClick={handlePublish}
              disabled={isPublishing || !code || publishCount >= MAX_PUBLISH_LIMIT}
              className="text-xs bg-black text-white px-3 py-1.5 rounded-md font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Publishing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45L20.45 19H3.55L12 5.45z"/></svg>
                  Publish to Vercel
                </>
              )}
            </button>
            <button 
              onClick={handleDownloadZip}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
              disabled={!code}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>

        <div className="flex-1 w-full relative overflow-hidden bg-slate-50">
          {code ? (
            <>
              {viewMode === 'preview' ? (
                <PreviewFrame html={code} />
              ) : (
                <CodeEditor code={code} onChange={handleManualCodeChange} />
              )}
              
              {/* Floating Live URL Pill - Enhanced Prominence */}
              {deployedUrl && viewMode === 'preview' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <a 
                    href={deployedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-700 group hover:scale-105 hover:bg-slate-800 transition-all active:scale-95 ring-4 ring-indigo-500/20"
                  >
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-ping absolute"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500 relative"></div>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5">Site is Live</span>
                      <span className="text-sm font-bold flex items-center gap-2">
                        {deployedUrl.replace('https://', '')}
                        <svg className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </span>
                    </div>
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-12 text-center">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                   </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Constructing Your Website</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Murodjon AI is turning your vision into code. This usually takes 5-10 seconds...</p>
              </div>
            </div>
          )}

          {isProcessing && code && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-30 flex items-center justify-center transition-all duration-300">
              <div className="bg-white p-6 rounded-2xl shadow-2xl border border-indigo-50 flex flex-col items-center space-y-4 animate-in zoom-in-95">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
                <p className="text-sm font-bold text-slate-700 tracking-wide uppercase">Applying Changes...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Load Project Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Saved Projects</h3>
              <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {savedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">No saved projects found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedProjects.sort((a,b) => b.timestamp - a.timestamp).map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadProject(project)}>
                        <h4 className="font-bold text-slate-800 truncate">{project.name}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{new Date(project.timestamp).toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => deleteProject(project.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowLoadModal(false)}
                className="w-full py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Generator;

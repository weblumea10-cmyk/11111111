
import React, { useState, useRef, useEffect } from 'react';
import { Message, Project } from '../types.ts';
import { generateWebsite, generateSEOfiles } from '../services/geminiService.ts';
import { publishToVercel } from '../services/vercelService.ts';
import { MAX_PUBLISH_LIMIT } from '../constants.ts';
import PreviewFrame from './PreviewFrame.tsx';
import CodeEditor from './CodeEditor.tsx';
import JSZip from 'jszip';
import Logo from './Logo.tsx';
import GenerationLoader from './GenerationLoader.tsx';

interface GeneratorProps {
  initialPrompt: string;
  credits: number;
  onUpdateCredits: () => void;
  history: Message[];
  setHistory: React.Dispatch<React.SetStateAction<Message[]>>;
}

type ViewMode = 'preview' | 'code';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const Generator: React.FC<GeneratorProps> = ({ initialPrompt, credits, onUpdateCredits, history, setHistory }) => {
  const [code, setCode] = useState<string>('');
  const [robotsTxt, setRobotsTxt] = useState<string>('User-agent: *\nAllow: /');
  const [sitemapXml, setSitemapXml] = useState<string>('');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInitialBuild, setIsInitialBuild] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [publishCount, setPublishCount] = useState<number>(() => {
    const saved = localStorage.getItem('murodjon_publish_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  
  const [savedProjects, setSavedProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('murodjon_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('murodjon_publish_count', publishCount.toString());
  }, [publishCount]);

  useEffect(() => {
    localStorage.setItem('murodjon_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const generateSEO = async (html: string) => {
    try {
      const seo = await generateSEOfiles(html);
      setRobotsTxt(seo.robots);
      setSitemapXml(seo.sitemap);
    } catch (e) {
      console.error("Failed to generate SEO files", e);
    }
  };

  useEffect(() => {
    if (isInitialBuild && initialPrompt) {
      const performInitialBuild = async () => {
        setIsProcessing(true);
        try {
          const generatedCode = await generateWebsite(initialPrompt, []);
          setCode(generatedCode);
          setHistory(prev => [...prev, { role: 'assistant', content: "Murodjon AI tayyor! Saytni yaratdim. Qanday o'zgartirishlar kiritamiz?" }]);
          onUpdateCredits();
          generateSEO(generatedCode);
        } catch (err: any) {
          const errorMsg = err.message.includes("capacity") 
            ? "AI hozirda juda band (quota to'lgan). Iltimos 1-2 daqiqadan so'ng qayta urunib ko'ring." 
            : "Saytni yaratishda xatolik yuz berdi. Iltimos qaytadan urunib ko'ring.";
          setHistory(prev => [...prev, { role: 'assistant', content: errorMsg }]);
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
    if (!userMessage || isProcessing) return;

    if (credits < 30000) {
      alert("Mablag' yetarli emas. Kamida 30,000 kredit kerak.");
      return;
    }

    const newMessage: Message = { role: 'user', content: userMessage };
    const updatedHistory = [...history, newMessage];
    
    setInput('');
    setIsProcessing(true);
    setDeployedUrl(null);
    setHistory(updatedHistory);

    try {
      const updatedCode = await generateWebsite(
        `Update/Recreate the website based on this request: "${userMessage}". 
        Return the FULL updated HTML code.`,
        updatedHistory
      );
      
      setCode(updatedCode);
      setHistory(prev => [...prev, { role: 'assistant', content: 'Veb-sayt yangilandi!' }]);
      onUpdateCredits();
      generateSEO(updatedCode);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg = err.message.includes("capacity") 
        ? "AI hozirda band yoki limit tugadi. Iltimos birozdan so'ng urunib ko'ring." 
        : "Xatolik yuz berdi. Iltimos qaytadan urunib ko'ring.";
      setHistory(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProject = () => {
    if (!code) return;
    const name = prompt("Loyiha nomini kiriting:", `Murodjon AI Project ${savedProjects.length + 1}`);
    if (!name) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      code,
      history,
      timestamp: Date.now()
    };

    setSavedProjects(prev => [newProject, ...prev]);
    alert("Loyiha muvaffaqiyatli saqlandi!");
  };

  const loadProject = (project: Project) => {
    setCode(project.code);
    setHistory(project.history);
    setIsInitialBuild(false);
    setIsLibraryOpen(false);
    setDeployedUrl(null);
    generateSEO(project.code);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Loyihani o'chirmoqchimisiz?")) {
      setSavedProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (credits < 30000) {
      alert("Fayl yuklash uchun kredit yetarli emas.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
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
          throw new Error('ZIP ichida HTML fayl topilmadi.');
        }
      } else if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.txt')) {
        extractedContent = await file.text();
      } else {
        throw new Error('Noma’lum fayl formati.');
      }

      const fileMessage: Message = { role: 'user', content: `[Fayl yuklandi] ${file.name} tahlil qilinmoqda...` };
      const updatedHistory = [...history, fileMessage];
      setHistory(updatedHistory);
      
      const prompt = `I have uploaded a file named ${file.name}. Here is its content: \n---\n${extractedContent}\n---\nPlease recreate this exactly using Tailwind CSS.`;
      
      const generatedCode = await generateWebsite(prompt, updatedHistory);
      setCode(generatedCode);
      setHistory(prev => [...prev, { role: 'assistant', content: `Fayl tahlil qilindi va sayt yaratildi!` }]);
      onUpdateCredits();
      generateSEO(generatedCode);
    } catch (err: any) {
      setHistory(prev => [...prev, { role: 'assistant', content: `Xatolik: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (publishCount >= MAX_PUBLISH_LIMIT) {
      alert("Publish limiti tugadi.");
      return;
    }
    setIsPublishing(true);
    try {
      const url = await publishToVercel(code, robotsTxt, sitemapXml);
      setDeployedUrl(url);
      setPublishCount(prev => prev + 1);
      setHistory(prev => [...prev, { role: 'assistant', content: `Sayt muvaffaqiyatli nashr etildi! Manzil: ${url}` }]);
    } catch (err: any) {
      alert(`Nashr qilishda xatolik: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      zip.file("index.html", code);
      zip.file("robots.txt", robotsTxt);
      if (sitemapXml) {
        zip.file("sitemap.xml", sitemapXml);
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Murodjon-AI-Projects.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Yuklab olishda xatolik.");
    } finally {
      setIsDownloading(false);
    }
  };

  const getDeviceWidth = () => {
    switch (deviceMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Sidebar for Chat */}
      <div className={`fixed inset-0 z-40 md:relative md:inset-auto md:flex ${isSidebarOpen ? 'flex' : 'hidden'} w-full md:w-96 flex-col bg-slate-900 border-r border-slate-800 shadow-2xl shadow-indigo-500/10`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <Logo theme="light" size="sm" />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10 font-medium' 
                : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50 shadow-inner'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-slate-800 border border-slate-700/50 px-5 py-3 rounded-2xl rounded-tl-none text-xs text-indigo-400 font-black uppercase tracking-widest">
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-400 transition-all bg-slate-800 rounded-xl hover:scale-110"
              title="Upload context"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".html,.zip,.txt" />
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Request updates..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={isProcessing || !input.trim()}
              className="bg-indigo-600 text-white p-3 rounded-xl disabled:opacity-30 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available</span>
              <span className="text-xs font-bold text-slate-300">{credits.toLocaleString()} Credits</span>
            </div>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded">30K / Update</span>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-20 border-b border-slate-200 flex items-center justify-between px-6 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden md:block">
               <Logo size="sm" />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800 uppercase tracking-widest'}`}
              >
                PREVIEW
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800 uppercase tracking-widest'}`}
              >
                CODE
              </button>
            </div>
            
            {viewMode === 'preview' && (
              <div className="hidden md:flex bg-slate-100 p-1 rounded-xl shadow-inner gap-1 border border-slate-200">
                <button
                  onClick={() => setDeviceMode('desktop')}
                  className={`p-1.5 rounded-lg transition-all ${deviceMode === 'desktop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Desktop View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
                <button
                  onClick={() => setDeviceMode('tablet')}
                  className={`p-1.5 rounded-lg transition-all ${deviceMode === 'tablet' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Tablet View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
                <button
                  onClick={() => setDeviceMode('mobile')}
                  className={`p-1.5 rounded-lg transition-all ${deviceMode === 'mobile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Mobile View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Library and Save buttons */}
            <button 
              onClick={() => setIsLibraryOpen(true)}
              className="p-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              title="Project Library"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </button>
            <button 
              onClick={handleSaveProject}
              className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Save Project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            {deployedUrl && viewMode === 'preview' && (
              <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-5 py-2.5 rounded-xl border border-green-100 hover:bg-green-100 transition-all uppercase tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                LIVE
              </a>
            )}
            {viewMode === 'preview' && (
              <>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !code}
                  className="bg-white text-slate-900 px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-30 uppercase tracking-widest"
                >
                  {isDownloading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  )}
                  Download
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !code}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-30 shadow-xl shadow-slate-200 uppercase tracking-widest"
                >
                  {isPublishing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  )}
                  Deploy
                </button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col items-center">
          {isProcessing && <GenerationLoader />}
          
          {viewMode === 'preview' ? (
            <div 
              className="flex-1 w-full flex justify-center transition-all duration-500 ease-in-out p-4 overflow-auto"
            >
              <div 
                style={{ width: getDeviceWidth() }} 
                className={`h-full bg-white transition-all duration-500 ease-in-out relative ${deviceMode !== 'desktop' ? 'shadow-2xl border-x-8 border-t-8 border-slate-800 rounded-t-3xl overflow-hidden' : ''}`}
              >
                {deviceMode !== 'desktop' && (
                  <div className="h-6 w-full bg-slate-800 flex items-center justify-center">
                    <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
                  </div>
                )}
                <PreviewFrame html={code} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              {/* Persistent Header for Code View */}
              <div className="bg-slate-800 border-b border-slate-700 h-14 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-[11px] font-black uppercase tracking-widest">index.html</span>
                  </div>
                  
                  {deployedUrl && (
                    <a 
                      href={deployedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-[10px] font-black text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all uppercase tracking-widest"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2h-4m0-12l4 4m0 0l-4 4m4-4H10" /></svg>
                      {deployedUrl.replace('https://', '')}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Deploy Limit</span>
                    <span className="text-xs font-bold text-slate-400">{publishCount} / {MAX_PUBLISH_LIMIT}</span>
                  </div>

                  <div className="h-6 w-px bg-slate-700"></div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading || !code}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-[10px] font-black flex items-center gap-2 transition-all disabled:opacity-30 uppercase tracking-widest"
                      title="Download Website"
                    >
                      {isDownloading ? (
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      )}
                      Download
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing || !code}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-[10px] font-black flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-30 uppercase tracking-widest"
                      title="Deploy to Vercel"
                    >
                      {isPublishing ? (
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      )}
                      Deploy
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <CodeEditor code={code} onChange={(val) => setCode(val || '')} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Projects Library Slide-over */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLibraryOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
            <div className="h-full w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Project Library</h2>
                  <p className="text-slate-400 text-sm font-medium">Saved locally in your browser</p>
                </div>
                <button onClick={() => setIsLibraryOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {savedProjects.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                       <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold">No Projects Found</h3>
                      <p className="text-slate-400 text-sm">Start generating and save your masterpiece.</p>
                    </div>
                  </div>
                ) : (
                  savedProjects.map((project) => (
                    <div 
                      key={project.id}
                      onClick={() => loadProject(project)}
                      className="group p-5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {new Date(project.timestamp).toLocaleDateString()} at {new Date(project.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => deleteProject(project.id, e)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <div className="mt-4 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-0 group-hover:w-full transition-all duration-500"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Generator;

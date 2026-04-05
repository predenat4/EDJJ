import React, { useState } from 'react';
import { MediaGallery } from './components/MediaGallery';
import { AdminPanel } from './components/AdminPanel';
import { ChatBot } from './components/ChatBot';
import { Key, ChevronLeft, Cross } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CrucifixIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2v20M7 8h10" />
  </svg>
);

export default function App() {
  const [view, setView] = useState<'gallery' | 'admin'>('gallery');
  const [showSplash, setShowSplash] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] selection:bg-blue-500/30 relative">
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Blobs for Splash */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse" />
            </div>

            {/* Center Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-700 via-purple-600 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)] border border-white/10">
                <CrucifixIcon className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
              </div>
            </motion.div>

            {/* Bottom Text */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="absolute bottom-16 text-center z-10"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl md:text-4xl font-black tracking-tighter text-white">EDJJ</span>
                <span className="text-3xl md:text-4xl font-black tracking-tighter text-blue-500">Media</span>
              </div>
              <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] mt-4 font-bold">Eglise de DIEU JEHOVAH JIREH</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Blobs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView('gallery')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 via-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:rotate-12 transition-all duration-500 group-hover:scale-110">
              <CrucifixIcon className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
            </div>
            <div className="flex flex-col -space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tighter text-white group-hover:text-purple-400 transition-colors">EDJJ</span>
                <span className="text-xl font-black tracking-tighter text-blue-500 group-hover:text-white transition-colors">Media</span>
              </div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Eglise de DIEU JEHOVAH JIREH</span>
            </div>
          </div>

          <button 
            onClick={() => setView(view === 'gallery' ? 'admin' : 'gallery')}
            className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all hover:scale-110 active:scale-95 border border-white/10 group"
            title={view === 'gallery' ? "Accès Admin" : "Retour à la galerie"}
          >
            {view === 'gallery' ? (
              <Key className="w-5 h-5 text-purple-500 group-hover:rotate-45 transition-transform" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-purple-500" />
            )}
          </button>
        </div>
      </header>

      {/* Hero / Accroche */}
      {view === 'gallery' && (
        <section className="relative py-32 overflow-hidden z-10">
          <div className="max-w-7xl mx-auto px-4 text-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-block mb-6 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold tracking-[0.3em] uppercase"
            >
              Bienvenue sur EDJJ Media (Eglise de DIEU JEHOVAH JIREH)
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 uppercase leading-[0.9]"
            >
              TELECHARGER LES MEDIA <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 bg-[length:200%_auto] animate-gradient-x blue-glow-text">
                DE NOTRE EGLISE ICI
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-zinc-400 max-w-2xl mx-auto text-sm md:text-lg uppercase tracking-[0.2em] font-medium leading-relaxed"
            >
              Retrouvez toutes les photos, vidéos et audios <br className="hidden md:block" /> de nos cultes et événements en un clic.
            </motion.p>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="flex-grow relative z-10">
        <AnimatePresence mode="wait">
          {view === 'gallery' ? (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <MediaGallery />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 mt-32 bg-black/40 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center border border-purple-500/20">
              <CrucifixIcon className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tighter text-white">EDJJ</span>
              <span className="text-xl font-black tracking-tighter text-purple-500">Media</span>
            </div>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-8">
            Eglise de DIEU JEHOVAH JIREH
          </p>
          <p className="text-zinc-500 text-[10px] md:text-xs uppercase tracking-[0.4em] font-bold mb-4">
            &copy; 2026 EDJJ Media tout droit réservé
          </p>
          <div className="h-px w-12 bg-purple-500/30 mx-auto mb-6" />
          <p className="text-zinc-600 text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
            Développé avec excellence par <span className="text-purple-400/80 font-bold">Predenat Jean Phenix</span>
          </p>
        </div>
      </footer>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}

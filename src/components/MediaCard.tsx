import React, { useState } from 'react';
import { Media } from '../types';
import { Eye, Download, Share2, X, Music, Video, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface MediaCardProps {
  media: Media;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: media.name,
          text: `Découvrez ce média de EDJJ Media: ${media.name}`,
          url: media.url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(media.url);
      alert('Lien copié dans le presse-papier !');
    }
  };

  const getIcon = () => {
    switch (media.type) {
      case 'audio': return <Music className="w-8 h-8 text-purple-400" />;
      case 'video': return <Video className="w-8 h-8 text-purple-400" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-purple-400" />;
    }
  };

  return (
    <>
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -8, transition: { duration: 0.3 } }}
        className="glass-card flex flex-col h-full group/card"
      >
        <div className="relative aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
          {media.type === 'image' ? (
            <img 
              src={media.url} 
              alt={media.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 transition-transform duration-500 group-hover/card:scale-110">
              {getIcon()}
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{media.type}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-4 backdrop-blur-[2px]">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="p-3 bg-white text-purple-600 shadow-xl shadow-purple-500/40 hover:scale-110 active:scale-95 transition-all rounded-full"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-sm line-clamp-1 flex-grow group-hover/card:text-purple-400 transition-colors" title={media.name}>
              {media.name}
            </h3>
            <span className="text-[10px] font-bold text-zinc-500 ml-2 whitespace-nowrap bg-white/5 px-2 py-0.5 rounded">
              {media.createdAt?.toDate ? format(media.createdAt.toDate(), 'dd/MM/yyyy') : '...'}
            </span>
          </div>
          
          <p className="text-xs text-zinc-400 line-clamp-2 mb-6 flex-grow leading-relaxed">
            {media.description || 'Pas de description.'}
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-purple-500/10 transition-all text-zinc-500 hover:text-purple-400 group/btn"
            >
              <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Aperçu</span>
            </button>
            <a 
              href={media.url} 
              download={media.name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-purple-500/10 transition-all text-zinc-500 hover:text-purple-400 group/btn"
            >
              <Download className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Télécharger</span>
            </a>
            <button 
              onClick={handleShare}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-purple-500/10 transition-all text-zinc-500 hover:text-purple-400 group/btn"
            >
              <Share2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Partager</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
            >
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                <div className="flex-grow bg-black flex items-center justify-center min-h-[300px]">
                  {media.type === 'image' && (
                    <img src={media.url} alt={media.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  )}
                  {media.type === 'video' && (
                    <video src={media.url} controls className="max-w-full max-h-full" />
                  )}
                  {media.type === 'audio' && (
                    <div className="flex flex-col items-center gap-6 w-full p-12">
                      <Music className="w-24 h-24 text-purple-500 animate-pulse" />
                      <audio src={media.url} controls className="w-full" />
                    </div>
                  )}
                </div>
                
                <div className="w-full md:w-80 p-6 flex flex-col border-t md:border-t-0 md:border-l border-zinc-800">
                  <h2 className="text-xl font-bold mb-2">{media.name}</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] rounded uppercase font-bold tracking-wider">
                      {media.type}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {media.createdAt?.toDate ? format(media.createdAt.toDate(), 'dd MMMM yyyy') : '...'}
                    </span>
                  </div>
                  
                  <p className="text-zinc-400 text-sm mb-6 flex-grow overflow-y-auto">
                    {media.description || 'Aucune description supplémentaire fournie pour ce média.'}
                  </p>

                  <div className="flex flex-col gap-3">
                    <a 
                      href={media.url} 
                      download={media.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-blue-gradient text-center py-3 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Télécharger
                    </a>
                    <button 
                      onClick={handleShare}
                      className="w-full py-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Partager
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

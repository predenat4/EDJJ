import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Media, MediaType } from '../types';
import { MediaCard } from './MediaCard';
import { Search, Filter, Loader2, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const MediaGallery: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<MediaType | 'all'>('all');

  useEffect(() => {
    const q = query(collection(db, 'medias'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Media[];
      setMedias(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredMedias = medias.filter(media => {
    const matchesSearch = media.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (media.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || media.type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: { id: MediaType | 'all', label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Vidéos' },
    { id: 'audio', label: 'Audios' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-purple-500 transition-all focus:ring-4 focus:ring-purple-500/10"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap relative overflow-hidden ${
                activeCategory === cat.id 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_10px_20px_-5px_rgba(139,92,246,0.5)] -translate-y-1 scale-105' 
                  : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-white/5'
              }`}
            >
              {cat.label}
              {activeCategory === cat.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute inset-0 bg-white/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-zinc-500 animate-pulse">Chargement des médias...</p>
        </div>
      ) : filteredMedias.length > 0 ? (
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredMedias.map((media) => (
              <MediaCard key={media.id} media={media} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <Ghost className="w-10 h-10 text-zinc-700" />
          </div>
          <h3 className="text-xl font-bold mb-2">Aucun média trouvé</h3>
          <p className="text-zinc-500 max-w-xs">
            Nous n'avons trouvé aucun média correspondant à vos critères de recherche.
          </p>
        </div>
      )}
    </div>
  );
};

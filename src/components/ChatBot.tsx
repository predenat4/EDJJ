import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Media } from '../types';
import { MessageCircle, X, Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [medias, setMedias] = useState<Media[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Fetch media context
  useEffect(() => {
    const q = query(collection(db, 'medias'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Media[];
      setMedias(data);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSystemInstruction = () => {
    const mediaContext = medias.map(m => 
      `- Nom: ${m.name}, Type: ${m.type}, Date: ${m.createdAt?.toDate ? format(m.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}, Description: ${m.description || 'N/A'}`
    ).join('\n');

    return `Tu es l'assistant intelligent de EDJJ Media, l'église EDJJ (Eglise de DIEU JEHOVAH JIREH). 
    L'église est dirigée par le Pasteur LAMBERT ABRAHAM.
    Ton rôle est d'aider les utilisateurs à trouver des médias (images, vidéos, audios) et de répondre à leurs questions sur l'église et ses services.
    
    Voici les horaires des services de notre église :
    - Dimanche matin : 7h00 à 9h00.
    - Dimanche soir : 17h00 (5h PM) à 19h00 (7h PM).
    - Mercredi : 17h00 (5h PM) à 19h00 (7h PM) - Ce sont des services d'enseignement.
    - Jeudi : Jeûne de 7h00 à 9h00.
    - Vendredi : Service de prière de 17h00 (5h PM) à 19h00 (7h PM).
    
    Voici la liste actuelle des médias disponibles sur le site :
    ${mediaContext}
    
    CONSIGNES DE RÉPONSE (TRÈS IMPORTANT) :
    1. NE JAMAIS UTILISER DE CARACTÈRES SPÉCIAUX DE FORMATAGE COMME LES ÉTOILES (*) OU LES DOUBLES ÉTOILES (**).
    2. Fournis des informations détaillées et complètes.
    3. Structure tes réponses point par point de manière claire (utilise des tirets "-" ou des numéros "1.", "2.").
    4. Sois poli, chaleureux et spirituel.
    5. Réponds en français.
    6. Tu te souviens du contexte de la conversation actuelle.
    7. Si un utilisateur demande des détails sur un média, donne toutes les informations disponibles (nom, type, date, description).
    8. Le sigle EDJJ signifie : Eglise de DIEU JEHOVAH JIREH.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: getSystemInstruction(),
          },
        });
      }

      const response = await chatRef.current.sendMessage({ message: userMessage });
      // Strip any remaining stars just in case the model ignores instructions
      const modelText = response.text.replace(/\*/g, '');
      
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Désolé, j'ai rencontré une erreur. Veuillez réessayer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    chatRef.current = null;
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-2xl shadow-purple-500/40 flex items-center justify-center text-white group"
      >
        <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-ping" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-50 w-[90vw] md:w-[400px] h-[600px] max-h-[70vh] glass-card flex flex-col shadow-2xl border-purple-500/20"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Assistant EDJJ</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-purple-100 font-medium uppercase tracking-wider">En ligne</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Effacer la discussion">
                  <Trash2 className="w-4 h-4 text-white/70" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-purple-500" />
                  </div>
                  <h4 className="font-bold text-zinc-300 mb-2">Bonjour !</h4>
                  <p className="text-xs text-zinc-500">
                    Je suis l'assistant de EDJJ Media. Comment puis-je vous aider aujourd'hui ? 
                    Je peux vous renseigner sur les photos, vidéos et audios disponibles.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-zinc-800' : 'bg-gradient-to-br from-blue-600 to-purple-600'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none' 
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                    <span className="text-xs text-zinc-500">L'assistant réfléchit...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Posez votre question..."
                  className="flex-grow bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-3 rounded-xl transition-all ${
                    !input.trim() || isLoading 
                      ? 'bg-zinc-800 text-zinc-600' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

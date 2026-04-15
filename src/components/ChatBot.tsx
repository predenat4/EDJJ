import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Media } from '../types';
import { MessageCircle, X, Send, Loader2, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

const SiriOrb: React.FC<{ isThinking?: boolean; size?: string }> = ({ isThinking, size = "w-16 h-16" }) => {
  return (
    <div className={`relative ${size} flex items-center justify-center`}>
      <div className="siri-wave">
        <div className={`siri-blob bg-blue-500 w-full h-full ${isThinking ? 'animate-[siri-morph_2s_infinite]' : ''}`} style={{ animationDelay: '0s' }} />
        <div className={`siri-blob bg-purple-500 w-full h-full ${isThinking ? 'animate-[siri-morph_2.5s_infinite]' : ''}`} style={{ animationDelay: '-1s' }} />
        <div className={`siri-blob bg-pink-500 w-full h-full ${isThinking ? 'animate-[siri-morph_3s_infinite]' : ''}`} style={{ animationDelay: '-2s' }} />
        <div className={`siri-blob bg-cyan-400 w-full h-full ${isThinking ? 'animate-[siri-morph_3.5s_infinite]' : ''}`} style={{ animationDelay: '-3s' }} />
      </div>
      <div className="relative z-10 w-full h-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
        {isThinking ? (
          <Loader2 className="w-1/2 h-1/2 text-white animate-spin opacity-80" />
        ) : (
          <Sparkles className="w-1/2 h-1/2 text-white" />
        )}
      </div>
    </div>
  );
};

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
    Le sigle EDJJ signifie : Eglise de DIEU JEHOVAH JIREH.
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
    1. STRUCTURE DES SERVICES : Uniquement pour présenter les horaires des services, utilise TOUJOURS une structure numérotée sous la forme "1- ", "2- ", "3- ".
    2. ESPACEMENT : Laisse TOUJOURS un paragraphe vide (double saut de ligne) entre chaque point d'information ou chaque service. C'est CRUCIAL pour la beauté et la clarté de l'affichage.
    3. CLARTÉ : Tes réponses doivent être élégantes, aérées et très faciles à lire. Évite absolument les blocs de texte compacts.
    4. PAS DE SYMBOLES : NE JAMAIS UTILISER D'ÉTOILES (*) OU DE DOUBLES ÉTOILES (**). Utilise uniquement du texte brut, des tirets ou des numéros.
    5. DÉTAILS : Sois très précis. Si tu parles d'un service, donne l'heure exacte et le type de service.
    6. POLITESSE : Sois chaleureux, accueillant et spirituel dans ton langage.
    7. LANGUE : Réponds exclusivement en français.
    8. MÉDIAS : Pour les médias, présente-les de manière claire avec un double saut de ligne entre chaque média.`;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Chat error:", errorMessage);
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
        className="fixed bottom-6 right-6 z-50 group"
      >
        <SiriOrb isThinking={isLoading && !isOpen} />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-ping" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8, filter: 'blur(20px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 100, scale: 0.8, filter: 'blur(20px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-6 z-50 w-[90vw] md:w-[450px] h-[700px] max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(139,92,246,0.3)] rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 backdrop-blur-2xl"
          >
            {/* Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-6 flex items-center justify-between relative z-10 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-4">
                <SiriOrb size="w-12 h-12" isThinking={isLoading} />
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight">Assistant EDJJ</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em]">Intelligence Artificielle</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={clearChat} className="p-2.5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white" title="Effacer la discussion">
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide relative z-10">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="mb-8"
                  >
                    <SiriOrb size="w-24 h-24" />
                  </motion.div>
                  <h4 className="font-black text-white text-2xl mb-4 tracking-tighter">Comment puis-je vous aider ?</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px]">
                    Je suis votre guide spirituel numérique pour EDJJ Media. Posez-moi n'importe quelle question sur nos services ou nos médias.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border border-white/10 ${
                      msg.role === 'user' ? 'bg-zinc-800/50' : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md'
                    }`}>
                      {msg.role === 'user' ? <User className="w-5 h-5 text-zinc-400" /> : <Bot className="w-5 h-5 text-blue-400" />}
                    </div>
                    <div className={`p-4 rounded-[2rem] text-sm whitespace-pre-wrap leading-relaxed shadow-xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-none' 
                        : 'bg-white/5 text-zinc-200 rounded-tl-none border border-white/5 backdrop-blur-md'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 items-center bg-white/5 p-4 rounded-[2rem] rounded-tl-none border border-white/5 backdrop-blur-md">
                    <div className="flex gap-1">
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Analyse en cours</span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 relative z-10 bg-white/5 border-t border-white/5">
              <div className="relative flex items-center gap-3">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Parlez-moi..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                    <Sparkles className="w-4 h-4 text-zinc-700" />
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-4 rounded-2xl transition-all ${
                    !input.trim() || isLoading 
                      ? 'bg-white/5 text-zinc-700' 
                      : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95'
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

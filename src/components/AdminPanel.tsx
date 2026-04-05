import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDropzone } from 'react-dropzone';
import { Upload, X, LogOut, CheckCircle2, AlertCircle, Loader2, Key, Settings, Trash2, Edit2, Save, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaType, Media } from '../types';
import { format } from 'date-fns';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  // Safe extraction of error message to avoid circular structures
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
    }
  };

  console.error('Firestore Error:', errInfo);
  
  // Throw a simplified error message to avoid stringification issues
  throw new Error(`Firestore ${operationType} error at ${path}: ${errorMessage}`);
};

const ALLOWED_EMAILS = [
  'predenatjeanphenix@gmail.com',
  'manemrosembert@gmail.com',
  'chretiensmaptoujouretenegbibla@gmail.com',
  'stepheclerveaux@gmail.com',
  'sonthonaxjean3@gmail.com'
];

export const AdminPanel: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'settings'>('upload');
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Management states
  const [medias, setMedias] = useState<Media[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cloudinary Settings
  const [cloudinaryConfig, setCloudinaryConfig] = useState({ cloudName: '', uploadPreset: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email) {
        const email = u.email.toLowerCase();
        const authorized = ALLOWED_EMAILS.includes(email);
        console.log("Auth state changed:", { email, authorized });
        setIsAuthorized(authorized);
      } else {
        setIsAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Cloudinary Settings
  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'cloudinary'), (doc) => {
      if (doc.exists()) {
        setCloudinaryConfig(doc.data() as any);
      }
    });
    return () => unsubscribe();
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    const path = 'medias';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Media[];
      setMedias(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [isAuthorized]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Erreur lors de la connexion.");
    }
  };

  const handleLogout = () => signOut(auth);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': []
    }
  } as any);

  const getMediaType = (file: File): MediaType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image'; // fallback
  };

  const handleUpload = async () => {
    if (uploadMode === 'file' && !file) return;
    if (uploadMode === 'url' && !externalUrl.trim()) return;
    if (!isAuthorized) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      console.log("Upload process started...", { uploadMode, title, hasFile: !!file });
      let finalUrl = '';
      let finalName = '';
      let finalType: MediaType = 'image';
      let finalSize = 0;

      if (uploadMode === 'file' && file) {
        finalName = title.trim() || file.name;
        finalSize = file.size;
        finalType = getMediaType(file);

        if (finalType === 'image') {
          // COMPRESSION ET CONVERSION EN BASE64 (Solution pour Haïti)
          console.log("Compressing image for direct database storage...");
          finalUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            // Timeout after 60 seconds (increased for slow connections)
            const timeout = setTimeout(() => {
              reject(new Error("Le traitement de l'image a pris trop de temps. L'image est peut-être trop lourde ou votre connexion est lente."));
            }, 60000);

            reader.readAsDataURL(file);
            reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                try {
                  console.log("Image loaded, starting canvas compression...");
                  const canvas = document.createElement('canvas');
                  const MAX_WIDTH = 800; // Slightly increased quality
                  const scaleSize = MAX_WIDTH / img.width;
                  canvas.width = MAX_WIDTH;
                  canvas.height = img.height * scaleSize;
                  
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                  
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Slightly increased quality
                  console.log("Compression complete, dataUrl length:", dataUrl.length);
                  clearTimeout(timeout);
                  resolve(dataUrl);
                } catch (e) {
                  console.error("Canvas compression error:", e);
                  clearTimeout(timeout);
                  reject(e);
                }
              };
              img.onerror = () => {
                console.error("Image loading error");
                clearTimeout(timeout);
                reject(new Error("Impossible de lire le contenu de l'image."));
              };
            };
            reader.onerror = error => {
              console.error("FileReader error:", error);
              clearTimeout(timeout);
              reject(error);
            };
          });
        } else {
          // Pour les vidéos/audios, on tente le Storage mais on prévient
          try {
            console.log("Attempting Firebase Storage upload for non-image file...");
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `medias/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            finalUrl = await getDownloadURL(snapshot.ref);
            console.log("Storage upload successful, URL:", finalUrl);
          } catch (e) {
            console.error("Storage upload failed:", e);
            throw new Error("Le stockage de fichiers volumineux est limité. Pour les vidéos, utilisez l'option 'Lien Direct' avec un lien YouTube ou Streamable.");
          }
        }
      } else {
        // Mode Lien Direct
        console.log("Using Direct Link mode...");
        finalUrl = externalUrl.trim();
        finalName = title.trim() || "Média externe";
        finalSize = 0;
        if (finalUrl.match(/\.(mp4|webm|ogg|mov)$/i)) finalType = 'video';
        else if (finalUrl.match(/\.(mp3|wav|ogg|m4a)$/i)) finalType = 'audio';
        else finalType = 'image';
      }

      const path = 'medias';
      console.log("Saving to Firestore collection:", path);
      const docData = {
        name: finalName,
        type: finalType,
        url: finalUrl,
        description: description,
        size: finalSize,
        createdAt: serverTimestamp()
      };
      console.log("Document data prepared:", { ...docData, url: finalUrl.substring(0, 50) + "..." });
      
      await addDoc(collection(db, path), docData);
      console.log("Firestore addDoc successful!");
      
      setProgress(100);
      setSuccess(true);
      setFile(null);
      setTitle('');
      setExternalUrl('');
      setDescription('');
      setUploading(false);
      setTimeout(() => {
        setSuccess(false);
        setProgress(0);
      }, 3000);
    } catch (err: any) {
      console.error("Detailed Error:", err);
      let msg = err.message || "Erreur de publication.";
      if (msg.includes("Missing or insufficient permissions")) {
        msg = "Erreur de permission. Vérifiez que vous êtes bien connecté en tant qu'administrateur.";
      } else if (msg.includes("The document is too large")) {
        msg = "L'image est trop grande. Essayez une image plus petite.";
      }
      setError(msg);
      setUploading(false);
      setProgress(0);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateDoc(doc(db, 'settings', 'cloudinary'), cloudinaryConfig);
    } catch (err) {
      // If doc doesn't exist, create it
      await addDoc(collection(db, 'settings'), { ...cloudinaryConfig, id: 'cloudinary' });
      // Note: In a real app we'd use setDoc with ID, but this is a quick fix
      await updateDoc(doc(db, 'settings', 'cloudinary'), cloudinaryConfig).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'settings', 'cloudinary'), cloudinaryConfig);
      });
    }
    setIsSavingSettings(false);
    alert("Paramètres enregistrés !");
  };

  const handleDelete = async (media: Media) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${media.name}" ?`)) return;
    setDeletingId(media.id);
    const path = `medias/${media.id}`;
    try {
      await deleteDoc(doc(db, 'medias', media.id));
      setDeletingId(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
      setDeletingId(null);
    }
  };

  const startEditing = (media: Media) => {
    setEditingId(media.id);
    setEditName(media.name);
  };

  const handleUpdateName = async (id: string) => {
    if (!editName.trim()) return;
    const path = `medias/${id}`;
    try {
      await updateDoc(doc(db, 'medias', id), {
        name: editName.trim()
      });
      setEditingId(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const filteredMedias = medias.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <Key className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Espace Administration</h2>
        <p className="text-zinc-500 text-center mb-8 max-w-sm">
          Veuillez vous connecter avec un compte autorisé pour gérer les médias de l'église.
        </p>
        <button onClick={handleLogin} className="btn-blue-gradient flex items-center gap-2">
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Se connecter avec Google
        </button>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-500 text-center mb-4 max-w-sm">
          Le compte <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">{user.email}</span> n'est pas dans la liste des administrateurs autorisés.
        </p>
        <p className="text-xs text-zinc-600 text-center mb-8 max-w-xs italic">
          Si c'est votre email principal, contactez le développeur pour l'ajouter à la liste blanche.
        </p>
        <div className="flex gap-4">
          <button onClick={handleLogout} className="px-8 py-3 rounded-full border border-zinc-700 hover:bg-zinc-800 transition-all text-sm font-bold active:scale-95">
            Changer de compte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img src={user.photoURL || ''} className="w-12 h-12 rounded-full border-2 border-purple-500" alt="Profile" />
          <div>
            <h2 className="font-bold text-lg">{user.displayName}</h2>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 bg-zinc-900/50 p-1.5 rounded-full border border-zinc-800 w-full md:w-fit overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('upload')}
          className={`flex-1 md:flex-none px-4 py-3.5 md:py-2.5 rounded-full text-[13px] md:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${
            activeTab === 'upload' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Upload className="w-4 h-4" />
          Ajouter
        </button>
        <button 
          onClick={() => setActiveTab('manage')}
          className={`flex-1 md:flex-none px-4 py-3.5 md:py-2.5 rounded-full text-[13px] md:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${
            activeTab === 'manage' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          Gérer ({medias.length})
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 md:flex-none px-4 py-3.5 md:py-2.5 rounded-full text-[13px] md:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${
            activeTab === 'settings' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Key className="w-4 h-4" />
          Paramètres
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-8"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6 text-purple-500" />
              Ajouter un nouveau média
            </h3>

            {/* Mode Selector */}
            <div className="flex gap-3 mb-6">
              <button 
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-3 md:py-2.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  uploadMode === 'file' ? 'bg-white/10 border-white/20 text-white' : 'border-zinc-800 text-zinc-500'
                }`}
              >
                Fichier (Firebase)
              </button>
              <button 
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-3 md:py-2.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  uploadMode === 'url' ? 'bg-white/10 border-white/20 text-white' : 'border-zinc-800 text-zinc-500'
                }`}
              >
                Lien Direct (Gratuit)
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
                  <p className="font-bold mb-1">✅ Mode Direct (Spécial Haïti) :</p>
                  Vos photos seront compressées et enregistrées directement. Pas besoin de compte externe.
                </div>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer active:scale-[0.98] ${
                    isDragActive ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-500" />
                      <p className="font-medium text-sm md:text-base truncate max-w-full px-4">{file.name}</p>
                      <p className="text-[10px] md:text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-2 text-xs text-red-500 hover:underline p-2"
                      >
                        Changer de fichier
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                        <Upload className="w-7 h-7 md:w-8 md:h-8 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm md:text-base">Cliquez ou glissez une PHOTO ici</p>
                        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">Envoi direct depuis votre appareil</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                  <p className="font-bold mb-1">💡 Astuce :</p>
                  Utilisez cette option si Firebase vous demande de payer. Collez simplement le lien direct vers votre image ou vidéo (ex: https://site.com/image.jpg).
                </div>
                <input 
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://exemple.com/votre-image.jpg"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Titre du média (Affiché sur le site)</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Culte du Dimanche 30 Mars"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[10px] text-zinc-500 mt-1 italic">Donnez un titre clair pour que le nom du fichier (ex: IMG_123.jpg) ne soit pas visible.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Description (optionnelle)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-500 transition-colors h-24 resize-none"
                placeholder="Entrez une brève description du média..."
              />
            </div>

            {uploading && (
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2">
                  <span>Upload en cours...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                </div>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg mb-6 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-grow">
                      <p className="font-bold">Erreur d'upload</p>
                      <p className="text-xs opacity-80">{error}</p>
                    </div>
                  </div>
                  <div className="text-[10px] bg-black/20 p-2 rounded border border-red-500/10 font-mono">
                    Conseil: Vérifiez que les "Storage Rules" dans votre console Firebase autorisent l'écriture et que le service Storage est activé.
                  </div>
                  <button 
                    onClick={() => { setError(null); setUploading(false); setProgress(0); }}
                    className="text-xs underline hover:text-white transition-colors self-start"
                  >
                    Réessayer
                  </button>
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-sm rounded-lg mb-6 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  Média ajouté avec succès !
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${
                !file || uploading 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'btn-blue-gradient shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Publier le média
                </>
              )}
            </button>
          </motion.div>
        )}
        {activeTab === 'manage' && (
          <motion.div 
            key="manage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un média par nom ou description..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {/* Media List */}
            <div className="grid gap-4">
              {filteredMedias.length === 0 ? (
                <div className="text-center py-20 glass-card">
                  <p className="text-zinc-500">Aucun média trouvé.</p>
                </div>
              ) : (
                filteredMedias.map((media) => (
                  <motion.div 
                    layout
                    key={media.id}
                    className="glass-card p-4 flex items-center gap-4 group"
                  >
                    <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                      {media.type === 'image' ? (
                        <img src={media.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          {media.type === 'video' ? '🎬' : '🎵'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      {editingId === media.id ? (
                        <div className="flex gap-2 items-center">
                          <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-zinc-800 border border-purple-500 rounded-full px-4 py-1.5 text-sm w-full focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleUpdateName(media.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full transition-colors">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-bold truncate text-sm">{media.name}</h4>
                      )}
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                        {media.type} • {media.createdAt?.toDate ? format(media.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}
                      </p>
                    </div>

                    <div className="flex gap-2 transition-all">
                      <button 
                        onClick={() => startEditing(media)}
                        className="p-2.5 bg-zinc-800 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-500 rounded-full transition-all flex items-center gap-2 active:scale-95"
                        title="Modifier le nom"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase hidden sm:inline">Modifier</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(media)}
                        disabled={deletingId === media.id}
                        className="p-2.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-full transition-all active:scale-95"
                        title="Supprimer"
                      >
                        {deletingId === media.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
        {(activeTab as any) === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-8"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-500" />
              Configuration Cloudinary (Gratuit)
            </h3>
            
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 mb-8">
              <p className="font-bold mb-2">🚀 Pourquoi utiliser Cloudinary ?</p>
              Firebase Storage demande désormais un plan payant (Blaze) pour uploader des fichiers. 
              Cloudinary est une alternative gratuite qui vous permet d'envoyer vos photos et vidéos directement depuis votre appareil.
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Cloud Name</label>
                <input 
                  type="text"
                  value={cloudinaryConfig.cloudName}
                  onChange={(e) => setCloudinaryConfig(prev => ({ ...prev, cloudName: e.target.value }))}
                  placeholder="Ex: dxy123abc"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Upload Preset (Unsigned)</label>
                <input 
                  type="text"
                  value={cloudinaryConfig.uploadPreset}
                  onChange={(e) => setCloudinaryConfig(prev => ({ ...prev, uploadPreset: e.target.value }))}
                  placeholder="Ex: ml_default"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={saveSettings}
                  disabled={isSavingSettings || !cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset}
                  className="w-full py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Enregistrer la configuration
                </button>
              </div>

              <div className="mt-8 p-6 border border-zinc-800 rounded-2xl">
                <h4 className="text-sm font-bold mb-2">Comment obtenir ces infos ?</h4>
                <ol className="text-[11px] text-zinc-500 space-y-2 list-decimal ml-4">
                  <li>Créez un compte gratuit sur <a href="https://cloudinary.com" target="_blank" className="text-blue-500 underline">cloudinary.com</a></li>
                  <li>Copiez votre <b>Cloud Name</b> depuis le tableau de bord.</li>
                  <li>Allez dans <b>Settings</b> &gt; <b>Upload</b> &gt; <b>Upload Presets</b>.</li>
                  <li>Cliquez sur "Add upload preset", mettez "Signing Mode" sur <b>Unsigned</b> et enregistrez.</li>
                  <li>Copiez le nom du preset (ex: <code className="bg-zinc-800 px-1">ml_default</code>) et collez-le ici.</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

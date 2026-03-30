import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
};

const ALLOWED_EMAILS = [
  'predenatjeanphenix@gmail.com',
  'manemrosembert@gmail.com',
  'chretiensmaptoujouretenegbibla@gmail.com',
  'stepheclerveaux@gmail.com'
];

export const AdminPanel: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  // Management states
  const [medias, setMedias] = useState<Media[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email && ALLOWED_EMAILS.includes(u.email)) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
    if (!file || !isAuthorized) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    console.log("Starting upload for:", file.name, "Size:", file.size, "Type:", file.type);

    try {
      const mediaType = getMediaType(file);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `medias/${fileName}`);
      
      console.log("Starting upload task for:", fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${p.toFixed(2)}% (${snapshot.state})`);
          // Ensure progress is at least 5% if started, to show activity
          setProgress(Math.max(p, 5));
        }, 
        (err) => {
          console.error("Upload error details:", err);
          setError(`Erreur d'envoi: ${err.message} (Code: ${err.code})`);
          setUploading(false);
          setProgress(0);
        }, 
        async () => {
          console.log("Upload finished successfully, getting URL...");
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const path = 'medias';
            
            await addDoc(collection(db, path), {
              name: file.name,
              type: mediaType,
              url: downloadURL,
              description: description,
              size: file.size,
              createdAt: serverTimestamp()
            });
            
            setProgress(100);
            setSuccess(true);
            setFile(null);
            setDescription('');
            setUploading(false);
            setTimeout(() => {
              setSuccess(false);
              setProgress(0);
            }, 3000);
          } catch (err: any) {
            console.error("Error after upload:", err);
            setError("Erreur lors de l'enregistrement final: " + err.message);
            setUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError("Une erreur inattendue est survenue: " + err.message);
      setUploading(false);
      setProgress(0);
    }
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
          <button onClick={handleLogout} className="px-6 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors text-sm">
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
      <div className="flex gap-2 mb-8 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
        <button 
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'upload' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Upload className="w-4 h-4" />
          Ajouter
        </button>
        <button 
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'manage' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          Gérer ({medias.length})
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

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer mb-6 ${
                isDragActive ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Changer de fichier
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium">Cliquez ou glissez un fichier ici</p>
                    <p className="text-xs text-zinc-500 mt-1">Images, Vidéos ou Audios</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Description (optionnelle)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 transition-colors h-24 resize-none"
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
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                !file || uploading 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'btn-blue-gradient'
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
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-all"
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
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-zinc-800 border border-purple-500 rounded px-2 py-1 text-sm w-full focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleUpdateName(media.id)} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
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

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEditing(media)}
                        className="p-2 bg-zinc-800 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-500 rounded-lg transition-all"
                        title="Modifier le nom"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(media)}
                        disabled={deletingId === media.id}
                        className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-lg transition-all"
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
      </AnimatePresence>
    </div>
  );
};

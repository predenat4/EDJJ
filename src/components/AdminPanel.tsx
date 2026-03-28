import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useDropzone } from 'react-dropzone';
import { Upload, X, LogOut, CheckCircle2, AlertCircle, Loader2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaType } from '../types';

const ALLOWED_EMAILS = [
  'predenatjeanphenix@gmail.com',
  'manemrosembert@gmail.com',
  'chretiensmaptoujouretenegbibla@gmail.com',
  'stepheclerveaux@gmail.com'
];

export const AdminPanel: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

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

    const mediaType = getMediaType(file);
    const storageRef = ref(storage, `medias/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      }, 
      (err) => {
        setError("Erreur lors de l'upload: " + err.message);
        setUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        try {
          await addDoc(collection(db, 'medias'), {
            name: file.name,
            type: mediaType,
            url: downloadURL,
            description: description,
            size: file.size,
            createdAt: serverTimestamp()
          });
          
          setSuccess(true);
          setFile(null);
          setDescription('');
          setUploading(false);
          setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
          setError("Erreur lors de l'enregistrement en base de données.");
          setUploading(false);
        }
      }
    );
  };

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
        <p className="text-zinc-500 text-center mb-8 max-w-sm">
          Votre compte ({user.email}) n'est pas autorisé à accéder à cet espace.
        </p>
        <button onClick={handleLogout} className="px-6 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors">
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img src={user.photoURL || ''} className="w-12 h-12 rounded-full border-2 border-blue-500" alt="Profile" />
          <div>
            <h2 className="font-bold text-lg">{user.displayName}</h2>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="glass-card p-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Upload className="w-6 h-6 text-blue-500" />
          Ajouter un nouveau média
        </h3>

        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer mb-6 ${
            isDragActive ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 hover:border-zinc-700'
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
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
                className="h-full bg-blue-500"
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
              className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg mb-6 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
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
      </div>
    </div>
  );
};

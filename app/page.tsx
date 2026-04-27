'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [reelsCount, setReelsCount] = useState(0);
  const [totalMB, setTotalMB] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadStats = async () => {
    const { data } = await supabase.storage.from('reels').list('', { limit: 1000 });

    const realReels = (data || []).filter(f => 
      f.name !== '.emptyFolderPlaceholder' && !f.name.includes('emptyFolderPlaceholder')
    );

    setReelsCount(realReels.length);

    const totalBytes = realReels.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
    setTotalMB(Number((totalBytes / (1024 * 1024)).toFixed(2)));
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    setMessage(null);

    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from('reels').upload(fileName, file);
    }

    setUploading(false);
    setMessage({ text: "✅ Upload terminé avec succès !", type: 'success' });
    loadStats();
  };

  // Version améliorée pour mobile
  const downloadRandomReel = async () => {
    if (reelsCount === 0) {
      setMessage({ text: "❌ Aucun reel disponible", type: 'error' });
      return;
    }

    if (!confirm("Vous voulez télécharger un reel au hasard ?")) {
      return;
    }

    try {
      const { data: currentReels } = await supabase.storage.from('reels').list('', { limit: 1000 });
      const realReels = (currentReels || []).filter(f => 
        f.name !== '.emptyFolderPlaceholder' && !f.name.includes('emptyFolderPlaceholder')
      );

      const randomFile = realReels[Math.floor(Math.random() * realReels.length)];
      const fileName = randomFile.name;

      const { data: urlData } = supabase.storage.from('reels').getPublicUrl(fileName);

      // Téléchargement fiable sur mobile
      const response = await fetch(urlData.publicUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Attente pour que le téléchargement commence
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Suppression du fichier dans Supabase
      await supabase.storage.from('reels').remove([fileName]);

      URL.revokeObjectURL(blobUrl);

      setMessage({ text: "✅ Reel téléchargé et supprimé avec succès !", type: 'success' });
      loadStats();
    } catch (err) {
      console.error(err);
      setMessage({ text: "❌ Erreur lors du téléchargement", type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Grande Image en haut */}
      <div className="relative h-[380px] w-full overflow-hidden">
        <img 
          src="/logo.png" 
          alt="Reels Manager" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-zinc-950"></div>
      </div>

      <div className="p-6 -mt-6 relative z-10">
        <h1 className="text-4xl font-bold text-center mb-8">Reels Manager</h1>

        {/* Message Box */}
        {message && (
          <div className={`mb-8 p-5 rounded-3xl text-center text-lg font-medium ${
            message.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
              : 'bg-red-500/20 border border-red-500 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="space-y-4 mb-10">
          <div className="bg-zinc-900 rounded-3xl p-8 text-center">
            <p className="text-zinc-400">NOMBRE DE FICHIERS</p>
            <p className="text-6xl font-bold mt-4">{reelsCount}</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 text-center">
            <p className="text-zinc-400">TAILLE TOTALE</p>
            <p className="text-6xl font-bold mt-4">{totalMB} <span className="text-2xl">MB</span></p>
          </div>
        </div>

        {/* Boutons */}
        <div className="space-y-5">
          <label className="block cursor-pointer">
            <div className="bg-white text-black font-semibold py-8 rounded-3xl text-xl text-center hover:bg-gray-100 transition-all">
              {uploading ? "Upload en cours..." : "⬆️ Uploader une vidéo"}
            </div>
            <input 
              type="file" 
              accept="video/*" 
              multiple 
              onChange={handleUpload} 
              className="hidden" 
            />
          </label>

          <button 
            onClick={downloadRandomReel}
            disabled={reelsCount === 0}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold py-8 rounded-3xl text-xl transition disabled:opacity-50"
          >
            🎲 Télécharger un Reel au hasard
          </button>
        </div>
      </div>
    </div>
  );
}

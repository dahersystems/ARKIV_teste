"use client";

import { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { useAudioContext } from "../context/AudioContext";
import { supabase } from "@/lib/supabase";

export function CreateFolderModal() {
  const { isFolderModalOpen, closeFolderModal, addFolder } = useAudioContext();
  const [folderName, setFolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const safeName = folderName.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 100);
    if (!safeName) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const { data, error } = await supabase
      .from('folders')
      .insert({ name: safeName })
      .select()
      .single();

    if (data && !error) {
      addFolder({
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at).getTime()
      });
      setFolderName("");
      closeFolderModal();
    } else {
      setSubmitError("Erro ao criar pasta. Tente novamente.");
    }

    setIsSubmitting(false);
  };

  if (!isFolderModalOpen) return null;

  return (
    <div className="upload-overlay" id="folder-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeFolderModal(); }}>
      <div className="upload-modal">
        <div className="upload-modal__header">
          <div className="upload-modal__header-icon">
            <FolderPlus size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="upload-modal__title">Nova Pasta</h2>
          </div>
          <button className="upload-modal__close" onClick={closeFolderModal} disabled={isSubmitting}>
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="upload-modal__field">
            <label htmlFor="folder-name" className="upload-modal__label">NOME DA PASTA</label>
            <input 
              type="text" 
              className="upload-modal__input" 
              id="folder-name" 
              placeholder="Ex: Inspirações, Beats..."
              maxLength={100}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          
          {submitError && (
            <p className="upload-modal__error">{submitError}</p>
          )}

          <div className="upload-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={closeFolderModal} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting || !folderName.trim()}>
              <FolderPlus size={15} strokeWidth={2.5} />
              {isSubmitting ? "Criando..." : "Criar Pasta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

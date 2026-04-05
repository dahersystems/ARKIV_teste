"use client";

import React, { useState, FormEvent, useRef, useCallback } from "react";
import { useAudioContext } from "@/context/AudioContext";
import { X, Upload, Music, CheckCircle2, Loader2, CloudUpload } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UploadState = "idle" | "uploading" | "done";

export function UploadModal() {
  const { isUploadOpen, closeUpload, addTrack, currentFolderId } = useAudioContext();
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (selected: File) => {
    setFile(selected);
    if (!fileName) setFileName(selected.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("audio/")) pickFile(dropped);
  }, [fileName]);

  const handleClose = () => {
    if (uploadState === "uploading") return;
    setFile(null);
    setFileName("");
    setProgress(0);
    setUploadState("idle");
    closeUpload();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !file) return;

    setUploadState("uploading");
    setProgress(10);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('arkiv-audio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(70);

      const { data: { publicUrl } } = supabase.storage
        .from('arkiv-audio')
        .getPublicUrl(filePath);

      const { data: trackData, error: dbError } = await supabase
        .from('tracks')
        .insert([{
          name: fileName,
          type: "track",
          status: "ready",
          audio_url: publicUrl,
          folder_id: currentFolderId || null
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);
      setUploadState("done");

      addTrack({
        id: trackData.id,
        name: trackData.name,
        type: trackData.type,
        status: trackData.status,
        audio_url: trackData.audio_url,
        folder_id: trackData.folder_id,
        createdAt: new Date(trackData.created_at).getTime(),
      });

      setTimeout(() => handleClose(), 1200);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Erro ao enviar arquivo.");
      setUploadState("idle");
      setProgress(0);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isUploadOpen) return null;

  return (
    <div
      className="upload-overlay"
      id="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="upload-modal">

        {/* Header */}
        <div className="upload-modal__header">
          <div className="upload-modal__header-icon">
            <CloudUpload size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="upload-modal__title" id="upload-modal-title">Adicionar Faixa</h2>
            {currentFolderId && <p className="upload-modal__subtitle">Salvando na pasta atual</p>}
          </div>
          <button className="upload-modal__close" onClick={handleClose} disabled={uploadState === "uploading"}>
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Drop Zone */}
          <div
            className={`drop-zone ${file ? "drop-zone--has-file" : ""} ${isDraggingFile ? "drop-zone--active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
              disabled={uploadState !== "idle"}
            />

            {file ? (
              <div className="drop-zone__file">
                <div className="drop-zone__file-icon">
                  <Music size={22} strokeWidth={1.5} />
                </div>
                <div className="drop-zone__file-info">
                  <span className="drop-zone__file-name">{file.name}</span>
                  <span className="drop-zone__file-size">{formatSize(file.size)}</span>
                </div>
                {uploadState === "idle" && (
                  <button
                    type="button"
                    className="drop-zone__remove"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setFileName(""); }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ) : (
              <div className="drop-zone__empty">
                <div className="drop-zone__icon">
                  <Upload size={28} strokeWidth={1.5} />
                </div>
                <p className="drop-zone__text">Arraste um áudio aqui</p>
                <p className="drop-zone__hint">ou <span>clique para selecionar</span></p>
                <p className="drop-zone__types">MP3 · WAV · OGG · FLAC · M4A</p>
              </div>
            )}
          </div>

          {/* Track name */}
          {file && uploadState === "idle" && (
            <div className="upload-modal__field">
              <label htmlFor="upload-track-name" className="upload-modal__label">Nome da faixa</label>
              <input
                id="upload-track-name"
                className="upload-modal__input"
                type="text"
                placeholder="Ex: Beat_Session_01"
                maxLength={80}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Progress bar */}
          {uploadState !== "idle" && (
            <div className="upload-progress">
              <div className="upload-progress__bar">
                <div
                  className={`upload-progress__fill ${uploadState === "done" ? "upload-progress__fill--done" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="upload-progress__status">
                {uploadState === "done" ? (
                  <span className="upload-progress__done"><CheckCircle2 size={13} /> Faixa adicionada!</span>
                ) : (
                  <span className="upload-progress__loading"><Loader2 size={13} className="animate-spin" /> Enviando...</span>
                )}
                <span className="upload-progress__pct">{progress}%</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {uploadState === "idle" && (
            <div className="upload-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={handleClose}>Cancelar</button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={!file || !fileName.trim()}
              >
                <Upload size={15} strokeWidth={2.5} />
                Enviar Faixa
              </button>
            </div>
          )}
        </form>

        <div className="toast-container" id="toast-container" aria-live="polite" role="status" />
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useCallback } from "react";
import { useAudioContext } from "@/context/AudioContext";
import { X, Upload, Music, CheckCircle2, Loader2, CloudUpload } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UploadState = "idle" | "uploading" | "done";

const ALLOWED_MIME = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/ogg", "audio/flac", "audio/x-flac",
  "audio/mp4", "audio/aac", "audio/x-m4a", "audio/m4a",
  "audio/webm",
]);
const MAX_FILE_SIZE_MB = 100;
const MAX_NAME_LENGTH  = 100;

/** Strip HTML tags and control characters from user-provided strings */
function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export function UploadModal() {
  const { isUploadOpen, closeUpload, addTrack, currentFolderId } = useAudioContext();
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_MIME.has(f.type))
      return "Tipo de arquivo não suportado. Use MP3, WAV, OGG, FLAC ou M4A.";
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return `Arquivo muito grande. Limite: ${MAX_FILE_SIZE_MB} MB.`;
    return null;
  };

  const pickFile = (selected: File) => {
    const err = validateFile(selected);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setFile(selected);
    if (!fileName) setFileName(sanitize(selected.name.replace(/\.[^/.]+$/, "")).slice(0, MAX_NAME_LENGTH));
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

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const safeName = sanitize(fileName).slice(0, MAX_NAME_LENGTH);
    if (!safeName || !file) return;

    // Double-check validation server-side guard on client
    const err = validateFile(file);
    if (err) { setFileError(err); return; }

    setUploadState("uploading");
    setProgress(10);
    setFileError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      // Namespace por user_id para coincidir com as políticas RLS do storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() ?? "bin";
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('arkiv-audio')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      setProgress(70);

      const { data: { publicUrl } } = supabase.storage
        .from('arkiv-audio')
        .getPublicUrl(filePath);

      const { data: trackData, error: dbError } = await supabase
        .from('tracks')
        .insert([{
          name: safeName,
          type: "track",
          status: "ready",
          audio_url: publicUrl,
          folder_id: currentFolderId || null,
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

    } catch {
      setFileError("Erro ao enviar arquivo. Tente novamente.");
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

          {fileError && (
            <p className="upload-modal__error">{fileError}</p>
          )}

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

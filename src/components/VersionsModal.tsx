"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Music, CheckCircle2, Loader2, Clock, Check, Trash2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Track } from "@/context/AudioContext";

type Version = {
  id: string;
  label: string;
  audio_url: string;
  created_at: string;
};

const ALLOWED_MIME = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/ogg", "audio/flac", "audio/x-flac",
  "audio/mp4", "audio/aac", "audio/x-m4a", "audio/m4a", "audio/webm",
]);

function sanitize(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

interface Props {
  track: Track;
  onClose: () => void;
  onAudioUrlUpdate: (trackId: string, newUrl: string) => void;
}

export function VersionsModal({ track, onClose, onAudioUrlUpdate }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">("idle");
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState(track.audio_url ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("track_versions")
        .select("*")
        .eq("track_id", track.id)
        .order("created_at", { ascending: false });
      if (data) setVersions(data);
      setLoading(false);
    }
    load();
  }, [track.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_MIME.has(f.type)) {
      setFileError("Tipo não suportado. Use MP3, WAV, OGG, FLAC ou M4A.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setFileError("Arquivo muito grande. Limite: 100 MB.");
      return;
    }
    setFileError(null);
    setFile(f);
    if (!label) setLabel(sanitize(f.name.replace(/\.[^/.]+$/, "")).slice(0, 60));
  };

  const handleUpload = async () => {
    if (!file || !label.trim()) return;
    const safeLabel = sanitize(label).slice(0, 60);
    if (!safeLabel) return;

    setUploadState("uploading");
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("arkiv-audio")
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      setProgress(65);
      const { data: { publicUrl } } = supabase.storage
        .from("arkiv-audio")
        .getPublicUrl(filePath);

      const { data: vData, error: dbError } = await supabase
        .from("track_versions")
        .insert([{ track_id: track.id, label: safeLabel, audio_url: publicUrl }])
        .select()
        .single();
      if (dbError) throw dbError;

      // New version becomes active
      await supabase.from("tracks").update({ audio_url: publicUrl }).eq("id", track.id);
      onAudioUrlUpdate(track.id, publicUrl);
      setActiveUrl(publicUrl);

      setVersions(prev => [vData, ...prev]);
      setProgress(100);
      setUploadState("done");
      setTimeout(() => {
        setUploadState("idle");
        setFile(null);
        setLabel("");
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 1200);
    } catch (err) {
      console.error("[VersionsModal] upload error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setFileError(`Erro ao enviar: ${msg}`);
      setUploadState("idle");
      setProgress(0);
    }
  };

  const handleActivate = async (version: Version) => {
    await supabase.from("tracks").update({ audio_url: version.audio_url }).eq("id", track.id);
    onAudioUrlUpdate(track.id, version.audio_url);
    setActiveUrl(version.audio_url);
  };

  const handleDelete = async (versionId: string) => {
    await supabase.from("track_versions").delete().eq("id", versionId);
    setVersions(prev => prev.filter(v => v.id !== versionId));
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div
      className="upload-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Versões da faixa"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="upload-modal versions-modal">
        {/* Header */}
        <div className="upload-modal__header">
          <div className="upload-modal__header-icon">
            <Clock size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="upload-modal__title">Versões</h2>
            <p className="upload-modal__subtitle" title={track.name}>{track.name}</p>
          </div>
          <button className="upload-modal__close" onClick={onClose}>
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Version list */}
        <div className="versions-list">
          {loading ? (
            <div className="versions-empty"><Loader2 size={18} className="animate-spin" /></div>
          ) : versions.length === 0 ? (
            <div className="versions-empty">Nenhuma versão salva ainda.</div>
          ) : (
            versions.map(v => {
              const isCurrent = v.audio_url === activeUrl;
              return (
                <div key={v.id} className={`version-row ${isCurrent ? "version-row--active" : ""}`}>
                  <div className="version-row__info">
                    {isCurrent && <Radio size={12} className="version-row__dot" />}
                    <span className="version-row__label">{v.label}</span>
                    <span className="version-row__date">{formatDate(v.created_at)}</span>
                  </div>
                  <div className="version-row__actions">
                    {!isCurrent && (
                      <button
                        className="version-row__btn version-row__btn--activate"
                        onClick={() => handleActivate(v)}
                        title="Tornar ativa"
                      >
                        <Check size={13} /> Ativar
                      </button>
                    )}
                    <button
                      className="version-row__btn version-row__btn--delete"
                      onClick={() => handleDelete(v.id)}
                      title="Excluir versão"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="versions-divider" />

        {/* Upload new version */}
        <div className="versions-upload">
          <p className="versions-upload__title">Nova versão</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
            disabled={uploadState === "uploading"}
          />

          {!file ? (
            <button
              className="versions-upload__pick"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState !== "idle"}
            >
              <Upload size={14} /> Selecionar áudio
            </button>
          ) : (
            <div className="versions-upload__file">
              <Music size={14} />
              <span className="versions-upload__file-name">{file.name}</span>
              <button onClick={() => { setFile(null); setLabel(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                <X size={12} />
              </button>
            </div>
          )}

          {file && uploadState === "idle" && (
            <input
              className="versions-upload__label-input"
              placeholder="Rótulo da versão (ex: v2 – mix final)"
              maxLength={60}
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          )}

          {fileError && <p className="versions-upload__error">{fileError}</p>}

          {uploadState !== "idle" && (
            <div className="upload-progress" style={{ padding: "0" }}>
              <div className="upload-progress__bar">
                <div className="upload-progress__fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="upload-progress__status">
                {uploadState === "done"
                  ? <span className="upload-progress__done"><CheckCircle2 size={13} /> Versão adicionada!</span>
                  : <span className="upload-progress__loading"><Loader2 size={13} className="animate-spin" /> Enviando...</span>
                }
                <span className="upload-progress__pct">{progress}%</span>
              </div>
            </div>
          )}

          {file && uploadState === "idle" && (
            <div className="upload-modal__actions" style={{ padding: "0" }}>
              <button className="btn btn--ghost" onClick={() => { setFile(null); setLabel(""); }}>Cancelar</button>
              <button
                className="btn btn--primary"
                onClick={handleUpload}
                disabled={!label.trim()}
              >
                <Upload size={14} /> Salvar versão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import { X, Share2, Link2, Check, Copy, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Track } from "@/context/AudioContext";

type ShareState = "idle" | "creating" | "done";

const WAVEFORM_BARS = 80;
const TOTAL_DURATION = 180; // seconds represented by the waveform
const DEFAULT_CLIP_DUR = 15;
const MIN_CLIP = 3;

/** Seeded pseudo-random waveform heights (0..1) based on track id */
function seededWave(seed: string, n: number): number[] {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return Array.from({ length: n }, (_, i) => {
    let v = (h ^ (i * 2654435761)) >>> 0;
    v ^= v >>> 16; v = Math.imul(v, 0x45d9f3b); v ^= v >>> 16;
    return 0.15 + (v % 1000) / 1000 * 0.85;
  });
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function extractPath(url: string): string | null {
  const match = url.match(/\/arkiv-audio\/(.+?)(\?|$)/);
  return match ? match[1] : null;
}

type DragType = "move" | "left" | "right";

interface WaveformClipSelectorProps {
  trackId: string;
  total: number;
  start: number;
  end: number;
  onChange: (s: number, e: number) => void;
}

function WaveformClipSelector({ trackId, total, start, end, onChange }: WaveformClipSelectorProps) {
  const bars = seededWave(trackId, WAVEFORM_BARS);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: DragType; startX: number; startS: number; startE: number } | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const startDrag = useCallback((clientX: number, type: DragType) => {
    dragRef.current = { type, startX: clientX, startS: start, startE: end };

    const onMove = (cx: number) => {
      if (!dragRef.current || !containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      const dx = (cx - dragRef.current.startX) / w * total;
      const { type: t, startS, startE } = dragRef.current;

      if (t === "move") {
        const dur = startE - startS;
        const ns = clamp(startS + dx, 0, total - dur);
        onChange(ns, ns + dur);
      } else if (t === "left") {
        onChange(clamp(startS + dx, 0, startE - MIN_CLIP), startE);
      } else {
        onChange(startS, clamp(startE + dx, startS + MIN_CLIP, total));
      }
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX); };
    const onEnd = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onEnd);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }, [start, end, total, onChange]);

  const winLeft = `${(start / total) * 100}%`;
  const winWidth = `${((end - start) / total) * 100}%`;

  return (
    <div className="wfc">
      <div className="wfc__track" ref={containerRef}>
        {/* Waveform bars */}
        <div className="wfc__bars">
          {bars.map((h, i) => {
            const barTime = (i / WAVEFORM_BARS) * total;
            const active = barTime >= start && barTime <= end;
            return (
              <div
                key={i}
                className={`wfc__bar${active ? " wfc__bar--on" : ""}`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        {/* Selection window */}
        <div
          className="wfc__win"
          style={{ left: winLeft, width: winWidth }}
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, "move"); }}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, "move")}
        >
          <div
            className="wfc__handle wfc__handle--l"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(e.clientX, "left"); }}
            onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, "left"); }}
          />
          <div
            className="wfc__handle wfc__handle--r"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(e.clientX, "right"); }}
            onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, "right"); }}
          />
        </div>
      </div>

      {/* Time labels */}
      <div className="wfc__times">
        <span className="wfc__time">{formatTime(start)}</span>
        <span className="wfc__dur">{Math.round(end - start)}s selecionado</span>
        <span className="wfc__time">{formatTime(end)}</span>
      </div>
    </div>
  );
}

interface Props {
  track: Track;
  onClose: () => void;
}

export function ShareModal({ track, onClose }: Props) {
  const [shareType, setShareType] = useState<"full" | "clip">("full");
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(DEFAULT_CLIP_DUR);
  const [state, setState] = useState<ShareState>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setState("creating");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const path = extractPath(track.audio_url ?? "");
      let signedUrl = track.audio_url ?? "";

      if (path) {
        const { data: signedData, error: signErr } = await supabase.storage
          .from("arkiv-audio")
          .createSignedUrl(path, 7 * 24 * 60 * 60);
        if (!signErr && signedData?.signedUrl) signedUrl = signedData.signedUrl;
      }

      if (shareType === "clip" && clipStart >= clipEnd) {
        setError("O início deve ser menor que o fim.");
        setState("idle");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("share_links")
        .insert([{
          track_id:   track.id,
          share_type: shareType,
          clip_start: shareType === "clip" ? clipStart : null,
          clip_end:   shareType === "clip" ? clipEnd   : null,
          signed_url: signedUrl,
        }])
        .select("token")
        .single();

      if (dbErr) throw dbErr;

      setShareUrl(`${window.location.origin}/share/${data.token}`);
      setState("done");
    } catch {
      setError("Erro ao gerar link. Tente novamente.");
      setState("idle");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="upload-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Compartilhar faixa"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="upload-modal share-modal">
        {/* Header */}
        <div className="upload-modal__header">
          <div className="upload-modal__header-icon">
            <Share2 size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="upload-modal__title">Compartilhar</h2>
            <p className="upload-modal__subtitle" title={track.name}>{track.name}</p>
          </div>
          <button className="upload-modal__close" onClick={onClose}>
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {state !== "done" ? (
          <div className="share-modal__body">
            {/* Type selector */}
            <div className="share-type-selector">
              <button
                className={`share-type-btn ${shareType === "full" ? "share-type-btn--active" : ""}`}
                onClick={() => setShareType("full")}
              >
                <Link2 size={14} /> Música completa
              </button>
              <button
                className={`share-type-btn ${shareType === "clip" ? "share-type-btn--active" : ""}`}
                onClick={() => setShareType("clip")}
              >
                <Scissors size={14} /> Trecho
              </button>
            </div>

            {shareType === "clip" && (
              <WaveformClipSelector
                trackId={track.id}
                total={TOTAL_DURATION}
                start={clipStart}
                end={clipEnd}
                onChange={(s, e) => { setClipStart(s); setClipEnd(e); }}
              />
            )}

            {error && <p className="upload-modal__error">{error}</p>}

            <div className="upload-modal__actions">
              <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
              <button
                className="btn btn--primary"
                onClick={handleCreate}
                disabled={state === "creating" || !track.audio_url}
              >
                {state === "creating"
                  ? <><span style={{ display: "inline-block" }}>⏳</span> Gerando...</>
                  : <><Share2 size={14} /> Gerar link</>
                }
              </button>
            </div>

            {!track.audio_url && (
              <p className="share-modal__warn">Esta faixa não tem áudio ainda.</p>
            )}
          </div>
        ) : (
          <div className="share-modal__result">
            <div className="share-modal__result-icon">
              <Check size={22} />
            </div>
            <p className="share-modal__result-title">Link gerado!</p>
            <p className="share-modal__result-sub">
              {shareType === "clip"
                ? `Trecho: ${formatTime(clipStart)} → ${formatTime(clipEnd)} (${Math.round(clipEnd - clipStart)}s)`
                : "Música completa"}
              {" · "}válido por 7 dias
            </p>
            <div className="share-modal__link-row">
              <span className="share-modal__link-text">{shareUrl}</span>
              <button
                className={`share-modal__copy-btn ${copied ? "share-modal__copy-btn--copied" : ""}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <button className="btn btn--ghost" style={{ alignSelf: "center", marginTop: 8 }} onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

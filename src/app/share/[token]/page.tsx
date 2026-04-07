"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Play, Pause, Music } from "lucide-react";

type ShareData = {
  track_name: string;
  cover_url: string | null;
  signed_url: string;
  share_type: string;
  clip_start: number | null;
  clip_end: number | null;
};

function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!token) return;
    async function load() {
      const { data: rows, error } = await supabase.rpc("get_share_by_token", { p_token: token });
      if (error || !rows || rows.length === 0) {
        setNotFound(true);
      } else {
        setData(rows[0] as ShareData);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  // Setup audio element
  useEffect(() => {
    if (!data?.signed_url) return;
    const audio = new Audio(data.signed_url);
    audioRef.current = audio;

    const start = data.share_type === "clip" && data.clip_start != null ? data.clip_start : 0;

    audio.addEventListener("loadedmetadata", () => {
      audio.currentTime = start;
      setDuration(
        data.share_type === "clip" && data.clip_end != null
          ? data.clip_end - start
          : audio.duration
      );
    });

    audio.addEventListener("timeupdate", () => {
      const elapsed = audio.currentTime - start;
      setCurrentTime(Math.max(0, elapsed));

      // Stop at clip_end
      if (data.share_type === "clip" && data.clip_end != null && audio.currentTime >= data.clip_end) {
        audio.pause();
        audio.currentTime = start;
        setIsPlaying(false);
        setCurrentTime(0);
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = start;
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [data]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !data) return;
    const start = data.share_type === "clip" && data.clip_start != null ? data.clip_start : 0;
    const t = parseFloat(e.target.value);
    audio.currentTime = start + t;
    setCurrentTime(t);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="share-page share-page--loading">
        <div className="share-page__spinner" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="share-page share-page--404">
        <Music size={48} strokeWidth={1} style={{ opacity: 0.2 }} />
        <p className="share-page__404-title">Link não encontrado</p>
        <p className="share-page__404-sub">Este link pode ter expirado ou é inválido.</p>
      </div>
    );
  }

  return (
    <div className="share-page">
      <div className="share-card">
        {/* Cover / artwork */}
        <div className="share-card__cover">
          {data?.cover_url ? (
            <img src={data.cover_url} alt="" className="share-card__cover-img" />
          ) : (
            <div className="share-card__cover-placeholder">
              <Music size={56} strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="share-card__info">
          <p className="share-card__name">{data?.track_name}</p>
          {data?.share_type === "clip" && (
            <p className="share-card__clip-badge">
              Trecho · {formatTime(data.clip_start ?? 0)} → {formatTime(data.clip_end ?? 0)}
            </p>
          )}
        </div>

        {/* Player */}
        <div className="share-card__player">
          <button className="share-card__play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pausar" : "Reproduzir"}>
            {isPlaying
              ? <Pause size={22} fill="currentColor" strokeWidth={0} />
              : <Play  size={22} fill="currentColor" strokeWidth={0} />
            }
          </button>

          <div className="share-card__progress">
            <span className="share-card__time">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="share-card__seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              style={{ "--pct": `${progress}%` } as React.CSSProperties}
            />
            <span className="share-card__time">{formatTime(duration)}</span>
          </div>
        </div>

        <p className="share-card__brand">ARKIV</p>
      </div>
    </div>
  );
}

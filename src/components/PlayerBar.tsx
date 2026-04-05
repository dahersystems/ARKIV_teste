"use client";

import { useAudioContext } from "@/context/AudioContext";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function PlayerBar() {
  const {
    tracks,
    activeTrackId,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
  } = useAudioContext();

  const track = tracks.find((t) => t.id === activeTrackId);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!activeTrackId) return null;

  return (
    <div className="player-bar">
      {/* Track info */}
      <div className="player-bar__info">
        <div className="player-bar__waveform">
          <div className="b" style={{ "--d": "0.6s", "--dl": "0.1s", "--mh": "12px" } as React.CSSProperties} />
          <div className="b" style={{ "--d": "0.8s", "--dl": "0.3s", "--mh": "10px" } as React.CSSProperties} />
          <div className="b" style={{ "--d": "0.5s", "--dl": "0.0s", "--mh": "14px" } as React.CSSProperties} />
          <div className="b" style={{ "--d": "0.7s", "--dl": "0.2s", "--mh": "8px"  } as React.CSSProperties} />
        </div>
        <span className="player-bar__name">{track?.name ?? "Unknown"}</span>
        <span className="player-bar__type">{track?.type?.toUpperCase()}</span>
      </div>

      {/* Controls */}
      <div className="player-bar__center">
        <button
          className="player-bar__playpause"
          onClick={() => track && togglePlay(activeTrackId, track.audio_url)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying
            ? <Pause size={18} fill="currentColor" strokeWidth={0} />
            : <Play  size={18} fill="currentColor" strokeWidth={0} />}
        </button>

        <div className="player-bar__seek">
          <span className="player-bar__time">{formatTime(currentTime)}</span>
          <div className="player-bar__track" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}>
            <div className="player-bar__fill" style={{ width: `${progress}%` }} />
            <div className="player-bar__thumb" style={{ left: `${progress}%` }} />
          </div>
          <span className="player-bar__time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="player-bar__volume">
        <button
          className="player-bar__vol-icon"
          onClick={() => setVolume(volume > 0 ? 0 : 1)}
          aria-label="Toggle mute"
        >
          {volume === 0
            ? <VolumeX size={16} />
            : <Volume2 size={16} />}
        </button>
        <div className="player-bar__track player-bar__track--vol" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setVolume(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
        }}>
          <div className="player-bar__fill" style={{ width: `${volume * 100}%` }} />
          <div className="player-bar__thumb" style={{ left: `${volume * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

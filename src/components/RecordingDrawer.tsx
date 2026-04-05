"use client";

import React, { useState, useEffect } from "react";
import { useAudioContext } from "@/context/AudioContext";

export function RecordingDrawer() {
  const { isRecordOpen, closeRecord, addTrack } = useAudioContext();
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordOpen && isRecording) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isRecordOpen) {
      setSeconds(0);
      setIsRecording(false);
    }
    return () => clearInterval(interval);
  }, [isRecordOpen, isRecording]);

  useEffect(() => {
    if (isRecordOpen && !isRecording && seconds === 0) {
      // Auto start on open for MVP mock
      setIsRecording(true);
    }
  }, [isRecordOpen, isRecording, seconds]);

  const handleSave = () => {
    addTrack({
      id: crypto.randomUUID(),
      name: `Gravação_${Math.floor(Math.random() * 999)}`,
      type: "record",
      status: "ready",
      createdAt: Date.now(),
    });
    closeRecord();
  };

  const handleCancel = () => {
    closeRecord();
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `00:${m}:${s}`;
  };

  if (!isRecordOpen) return null;

  return (
    <div className="recording-drawer-overlay">
      <div className="recording-drawer">
        <div className="recording-header">
          <div className="recording-stats">
            <span>4 / 4</span>
            <div className="stat-box">OO</div>
            <div className="stat-box">-</div>
            <span>120 BPM</span>
          </div>
          <h3>New recording</h3>
          <button className="expand-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
        </div>

        <div className="recording-display">
          <div className="recording-timer">{formatTime(seconds)}</div>
          <div className="recording-wave">
            {/* Linha pontilhada mock */}
            <div className="wave-active"></div>
            <div className="wave-idle"></div>
            <div className="wave-cursor"></div>
          </div>
        </div>

        <div className="recording-actions">
          <button className="btn-cancel-rec" onClick={handleCancel}>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Cancel
          </button>
          <button className="btn-save-rec" onClick={handleSave}>
            Save
          </button>
          <button className="btn-retry-rec" onClick={() => setSeconds(0)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.12-11.23L2 6"></path>
            </svg>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

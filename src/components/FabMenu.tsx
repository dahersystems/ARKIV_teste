"use client";

import React from "react";
import { useAudioContext } from "@/context/AudioContext";
import { Music, RefreshCw, Mic, FolderPlus, Layers, Plus, X } from "lucide-react";

export function FabMenu() {
  const { isFabOpen, toggleFab, openUpload, openRecord, openFolderModal } = useAudioContext();
  return (
    <div className="fab-wrapper" id="fab-wrapper">
      {/* Sliding Menu */}
      <div className="fab-menu" id="fab-menu" aria-hidden={!isFabOpen}>
        <button className="fab-menu__item" id="btn-fab-audio" aria-label="Upload Audio" onClick={openUpload}>
          <Music size={16} />
          Upload Audio
        </button>
        <button className="fab-menu__item" id="btn-fab-convert" aria-label="Axc Convert">
          <RefreshCw size={16} />
          Convert
        </button>
        <button className="fab-menu__item" id="btn-fab-record" aria-label="Record Mic" onClick={openRecord}>
          <Mic size={16} color="var(--red, #ff4040)" />
          Record
        </button>
        <button className="fab-menu__item" id="btn-fab-folder" aria-label="New Folder" onClick={openFolderModal}>
          <FolderPlus size={16} />
          New Folder
        </button>
        <button className="fab-menu__item" id="btn-fab-project" aria-label="New Project">
          <Layers size={16} />
          New Project
        </button>
      </div>
      
      {/* Main Toggle Button */}
      <button className={`fab-toggle ${isFabOpen ? "is-open" : ""}`} id="fab-toggle" aria-label="Menu de ações" aria-expanded={isFabOpen} onClick={toggleFab}>
        <span className="fab-toggle__icon" style={{display: 'flex', alignItems: 'center'}}>{isFabOpen ? <X size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}</span>
        <span className="fab-toggle__text">{isFabOpen ? "Close" : "New"}</span>
      </button>
    </div>
  );
}

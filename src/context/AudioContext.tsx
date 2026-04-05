"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

export type Track = {
  id: string;
  name: string;
  type: string;
  status: "ready" | "processing" | "recording";
  audio_url?: string;
  folder_id?: string | null;
  createdAt: number;
};

type AudioContextType = {
  tracks: Track[];
  folders: Folder[];
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  isFabOpen: boolean;
  isUploadOpen: boolean;
  isRecordOpen: boolean;
  isFolderModalOpen: boolean;
  isSettingsOpen: boolean;
  activeTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addFolder: (folder: Folder) => void;
  toggleFab: () => void;
  closeFab: () => void;
  openUpload: () => void;
  closeUpload: () => void;
  openRecord: () => void;
  closeRecord: () => void;
  openFolderModal: () => void;
  closeFolderModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  togglePlay: (id: string, url?: string) => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    async function loadData() {
      // Load Tracks
      const { data: tData } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (tData) {
        setTracks(tData.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          status: d.status,
          audio_url: d.audio_url,
          folder_id: d.folder_id,
          createdAt: new Date(d.created_at).getTime()
        })));
      }

      // Load Folders
      const { data: fData } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (fData) {
        setFolders(fData.map(d => ({
          id: d.id,
          name: d.name,
          createdAt: new Date(d.created_at).getTime()
        })));
      }
    }
    loadData();
  }, []);

  const addTrack = (track: Track) => setTracks((prev) => [track, ...prev]);
  const removeTrack = (id: string) => setTracks((prev) => prev.filter((t) => t.id !== id));
  const addFolder = (folder: Folder) => setFolders((prev) => [folder, ...prev]);

  const toggleFab = () => setIsFabOpen((prev) => !prev);
  const closeFab = () => setIsFabOpen(false);

  const openUpload = () => {
    setIsUploadOpen(true);
    closeFab();
  };
  const closeUpload = () => setIsUploadOpen(false);

  const openRecord = () => {
    setIsRecordOpen(true);
    closeFab();
  };
  const closeRecord = () => setIsRecordOpen(false);

  const openFolderModal = () => {
    setIsFolderModalOpen(true);
    closeFab();
  };
  const closeFolderModal = () => setIsFolderModalOpen(false);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const togglePlay = (id: string, url?: string) => {
    if (!audioRef.current || !url) return;

    if (activeTrackId === id) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      audioRef.current.src = url;
      audioRef.current.play();
      setActiveTrackId(id);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (vol: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = vol;
    setVolumeState(vol);
  };

  return (
    <AudioContext.Provider
      value={{
        tracks,
        folders,
        currentFolderId,
        setCurrentFolderId,
        isFabOpen,
        isUploadOpen,
        isRecordOpen,
        isFolderModalOpen,
        activeTrackId,
        isPlaying,
        currentTime,
        duration,
        volume,
        addTrack,
        removeTrack,
        addFolder,
        toggleFab,
        closeFab,
        openUpload,
        closeUpload,
        openRecord,
        closeRecord,
        openFolderModal,
        closeFolderModal,
        isSettingsOpen,
        openSettings,
        closeSettings,
        togglePlay,
        seek,
        setVolume,
      }}
    >
      <audio
        ref={audioRef}
        onEnded={() => { setActiveTrackId(null); setIsPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        style={{ display: 'none' }}
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudioContext must be used within an AudioProvider");
  }
  return context;
}

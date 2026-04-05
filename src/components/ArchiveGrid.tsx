"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAudioContext, Track, Folder as FolderType } from "@/context/AudioContext";
import { Play, Pause, MoreHorizontal, FileAudio, Folder, Mic, Music, ArrowLeft, Pencil, FolderInput, FolderMinus, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type MenuState = { trackId: string; x: number; y: number } | null;

export function ArchiveGrid() {
  const { tracks, folders, currentFolderId, setCurrentFolderId, activeTrackId, togglePlay } = useAudioContext();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = useState<Track[] | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayTracks = localTracks ?? tracks;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
        setShowFolderPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Folder size={12} />;
      case 'record': return <Mic size={12} />;
      case 'sample': return <FileAudio size={12} />;
      default: return <Music size={12} />;
    }
  };

  const handleDrop = async (folderId: string) => {
    if (!draggingId) return;
    setDragOverFolderId(null);
    setLocalTracks((displayTracks).map(t =>
      t.id === draggingId ? { ...t, folder_id: folderId } : t
    ));
    setDraggingId(null);
    const { error } = await supabase.from('tracks').update({ folder_id: folderId }).eq('id', draggingId);
    if (error) { console.error(error); setLocalTracks(null); }
  };

  const handleRename = async (trackId: string) => {
    if (!editName.trim()) return;
    setLocalTracks(displayTracks.map(t => t.id === trackId ? { ...t, name: editName.trim() } : t));
    setEditingId(null);
    await supabase.from('tracks').update({ name: editName.trim() }).eq('id', trackId);
  };

  const handleMoveToFolder = async (trackId: string, folderId: string) => {
    setMenu(null);
    setShowFolderPicker(false);
    setLocalTracks(displayTracks.map(t => t.id === trackId ? { ...t, folder_id: folderId } : t));
    await supabase.from('tracks').update({ folder_id: folderId }).eq('id', trackId);
  };

  const handleRemoveFromFolder = async (trackId: string) => {
    setMenu(null);
    setLocalTracks(displayTracks.map(t => t.id === trackId ? { ...t, folder_id: null } : t));
    await supabase.from('tracks').update({ folder_id: null }).eq('id', trackId);
  };

  const handleDelete = async (trackId: string) => {
    setMenu(null);
    const track = displayTracks.find(t => t.id === trackId);
    if (!confirm(`Excluir "${track?.name}"? Esta ação não pode ser desfeita.`)) return;
    setLocalTracks(displayTracks.filter(t => t.id !== trackId));
    await supabase.from('tracks').delete().eq('id', trackId);
  };

  const openMenu = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ trackId, x: rect.right, y: rect.bottom });
    setShowFolderPicker(false);
  };

  const tracksToDisplay = currentFolderId
    ? displayTracks.filter(t => t.folder_id === currentFolderId)
    : displayTracks.filter(t => !t.folder_id);

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const menuTrack = menu ? displayTracks.find(t => t.id === menu.trackId) : null;

  return (
    <main className="main" id="main">
      <div className="streaming-bar" id="streaming-now" aria-label="Em reprodução agora">
        <div id="streaming-now-content" className="streaming-bar__content">
          {activeTrackId ? (
            <div className="stream-inline">
              <div className="stream-inline__dot"></div>
              <span className="stream-inline__name">
                {tracks.find(t => t.id === activeTrackId)?.name || 'Unknown Audio'}
              </span>
              <div className="stream-inline__bars">
                <div className="b" style={{"--d": "0.6s", "--dl": "0.1s", "--mh": "12px"} as React.CSSProperties}></div>
                <div className="b" style={{"--d": "0.8s", "--dl": "0.3s", "--mh": "10px"} as React.CSSProperties}></div>
                <div className="b" style={{"--d": "0.5s", "--dl": "0.0s", "--mh": "14px"} as React.CSSProperties}></div>
                <div className="b" style={{"--d": "0.7s", "--dl": "0.2s", "--mh": "8px"} as React.CSSProperties}></div>
              </div>
            </div>
          ) : (
            <span className="streaming-bar__idle">— nada em reprodução</span>
          )}
        </div>
      </div>

      <section className="archive-section" aria-label="Arquivo de arquivos">
        {currentFolderId ? (
          <div className="folder-header">
            <button className="btn-back" onClick={() => setCurrentFolderId(null)}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <h1>{currentFolder?.name || 'Pasta'}</h1>
          </div>
        ) : null}

        <div className="archive-grid" id="archive-grid" role="list">
          {!currentFolderId && folders.map((folder: FolderType) => {
            const count = displayTracks.filter(t => t.folder_id === folder.id).length;
            const isDragTarget = dragOverFolderId === folder.id;
            return (
              <article
                key={folder.id}
                className={`folder-card ${isDragTarget ? 'folder-card--drag-over' : ''}`}
                onClick={() => setCurrentFolderId(folder.id)}
                onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(folder.id); }}
              >
                <div className="card__thumb">
                  <div className="folder-thumb-icon">
                    <Folder size={40} strokeWidth={1.5} />
                  </div>
                  {isDragTarget && (
                    <div className="folder-drop-hint">
                      <Folder size={22} strokeWidth={2} />
                      <span>Soltar aqui</span>
                    </div>
                  )}
                </div>
                <div className="folder-info">
                  <span className="folder-name" title={folder.name}>{folder.name}</span>
                  <span className="folder-count">{count} {count === 1 ? 'faixa' : 'faixas'}</span>
                </div>
              </article>
            );
          })}

          {tracksToDisplay.map((track: Track) => {
            const isActive = track.id === activeTrackId;
            const isDragging = track.id === draggingId;
            const isEditing = editingId === track.id;
            return (
              <article
                key={track.id}
                className={`archive-card archive-card--new ${isActive ? 'archive-card--active' : ''} ${isDragging ? 'archive-card--dragging' : ''}`}
                draggable={!currentFolderId && !isEditing}
                onDragStart={() => setDraggingId(track.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverFolderId(null); }}
              >
                <div className="card__thumb">
                  <button className="card__play" aria-label="Play" onClick={(e) => {
                    e.stopPropagation();
                    togglePlay(track.id, track.audio_url);
                  }}>
                    {isActive ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
                  </button>
                  <button className="card__menu" aria-label="Opções" onClick={(e) => openMenu(e, track.id)}>
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className="card__info">
                  {isEditing ? (
                    <div className="card__rename" onClick={e => e.stopPropagation()}>
                      <input
                        className="card__rename-input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(track.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button className="card__rename-btn" onClick={() => handleRename(track.id)}><Check size={13} /></button>
                      <button className="card__rename-btn card__rename-btn--cancel" onClick={() => setEditingId(null)}><X size={13} /></button>
                    </div>
                  ) : (
                    <span className="card__title" title={track.name}>{track.name}</span>
                  )}
                  <div className="card__meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <span className="card-type-icon">{getTypeIcon(track.type)}</span>
                      <span className="card__label">{track.type.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {tracksToDisplay.length === 0 && folders.length === 0 && (
          <div className="empty-state" id="empty-state" aria-live="polite">
            <div className="empty-state__icon" aria-hidden="true">
              <Folder size={48} strokeWidth={1.5} />
            </div>
            <p className="empty-state__title">Nenhum arquivo encontrado</p>
            <p className="empty-state__sub">Adicione um novo arquivo para começar</p>
          </div>
        )}
      </section>

      {/* CONTEXT MENU */}
      {menu && menuTrack && (
        <div
          ref={menuRef}
          className="ctx-menu"
          style={{
            position: 'fixed',
            top: menu.y + 4,
            left: Math.min(menu.x, window.innerWidth - 210),
            zIndex: 1000
          }}
        >
          {showFolderPicker ? (
            <>
              <div className="ctx-menu__header">Mover para pasta</div>
              {folders.map(f => (
                <button key={f.id} className="ctx-menu__item" onClick={() => handleMoveToFolder(menu.trackId, f.id)}>
                  <Folder size={14} /> {f.name}
                </button>
              ))}
              {folders.length === 0 && <div className="ctx-menu__empty">Nenhuma pasta criada</div>}
              <div className="ctx-menu__divider" />
              <button className="ctx-menu__item" onClick={() => setShowFolderPicker(false)}>
                <ArrowLeft size={14} /> Voltar
              </button>
            </>
          ) : (
            <>
              <button className="ctx-menu__item" onClick={() => { togglePlay(menu.trackId, menuTrack.audio_url); setMenu(null); }}>
                {activeTrackId === menu.trackId ? <Pause size={14} /> : <Play size={14} />}
                {activeTrackId === menu.trackId ? 'Pausar' : 'Reproduzir'}
              </button>
              <button className="ctx-menu__item" onClick={() => { setEditingId(menu.trackId); setEditName(menuTrack.name); setMenu(null); }}>
                <Pencil size={14} /> Renomear
              </button>
              {!currentFolderId && (
                <button className="ctx-menu__item" onClick={() => setShowFolderPicker(true)}>
                  <FolderInput size={14} /> Mover para Pasta
                </button>
              )}
              {currentFolderId && (
                <button className="ctx-menu__item" onClick={() => handleRemoveFromFolder(menu.trackId)}>
                  <FolderMinus size={14} /> Tirar da Pasta
                </button>
              )}
              <div className="ctx-menu__divider" />
              <button className="ctx-menu__item ctx-menu__item--danger" onClick={() => handleDelete(menu.trackId)}>
                <Trash2 size={14} /> Excluir
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

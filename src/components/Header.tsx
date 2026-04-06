"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, X, Music, Upload, Folder, CheckCheck, Settings, LogOut, HardDrive, Shield } from "lucide-react";
import { useAudioContext } from "@/context/AudioContext";
import { supabase } from "@/lib/supabase";

type Notif = { id: number; title: string; body: string; read: boolean; icon: "upload" | "folder" | "music" | "system"; time: string };

const INITIAL_NOTIFS: Notif[] = [
  { id: 1, title: "Bem-vindo ao ARKIV", body: "Faça upload ou ouça seus áudios.", read: false, icon: "music", time: "agora" },
  { id: 2, title: "Player ativado", body: "O player web foi ativado com sucesso.", read: true, icon: "system", time: "hoje" },
];

export function Header() {
  const { tracks, folders, openSettings } = useAudioContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState("AU");
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
        const parts = data.user.email.split("@")[0].split(/[._-]/);
        setUserInitials((parts[0]?.[0] ?? "A").toUpperCase() + (parts[1]?.[0] ?? parts[0]?.[1] ?? "U").toUpperCase());
      }
    });
  }, []);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Close search on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQ(""); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.reload(); };

  // Mock storage: each track ~3MB
  const usedMB = tracks.length * 3;
  const totalMB = 500;
  const storagePercent = Math.min(100, Math.round((usedMB / totalMB) * 100));

  const getNotifIcon = (icon: Notif["icon"]) => {
    switch (icon) {
      case "upload": return <Upload size={14} />;
      case "folder": return <Folder size={14} />;
      case "music": return <Music size={14} />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <>
      <header className={`header ${searchOpen ? "search-active" : ""}`} id="header">
        <div className="header__inner">

          {/* LEFT – Logo */}
          <div className="header__logo">
            <span className="logo-text">ARKIV</span>
          </div>

          {/* CENTER – Search toggle */}
          <div className="header__center">
            {searchOpen ? (
              <div className="header__search-bar">
                <Search size={14} strokeWidth={2} style={{ color: "var(--t3)", flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  className="header__search-input"
                  type="text"
                  placeholder="Buscar faixas e pastas…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  aria-label="Campo de busca"
                />
                <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => { setSearchOpen(false); setSearchQ(""); }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="header__search-pill"
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar"
              >
                <Search size={14} strokeWidth={2.5} />
                <span className="header__search-label">Buscar...</span>
              </button>
            )}
          </div>

          {/* RIGHT – Notif + Profile */}
          <div className="header__actions">
            {/* NOTIFICATIONS */}
            <div className="header__panel-wrap" ref={notifRef}>
              <button
                className={`icon-btn header__action-btn ${notifOpen ? "is-active" : ""}`}
                id="btn-notifications"
                aria-label="Notificações"
                onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
              >
                <Bell size={17} strokeWidth={2} />
                {unread > 0 && <span className="notif-badge">{unread}</span>}
              </button>

              {notifOpen && (
                <div className="header__dropdown notif-panel">
                  <div className="panel-header">
                    <span className="panel-title">Notificações</span>
                    {unread > 0 && (
                      <button className="panel-action" onClick={markAllRead}>
                        <CheckCheck size={13} /> Marcar lidas
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifs.map(n => (
                      <div
                        key={n.id}
                        className={`notif-row ${!n.read ? "notif-row--unread" : ""}`}
                        onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                      >
                        <div className="notif-row__icon">{getNotifIcon(n.icon)}</div>
                        <div className="notif-row__body">
                          <span className="notif-row__title">{n.title}</span>
                          <span className="notif-row__sub">{n.body}</span>
                        </div>
                        <span className="notif-row__time">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="header__panel-wrap" ref={profileRef}>
              <button
                className={`avatar-btn ${profileOpen ? "is-active" : ""}`}
                id="btn-avatar"
                aria-label="Perfil"
                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
              >
                <div className="avatar">{userInitials}</div>
              </button>

              {profileOpen && (
                <div className="header__dropdown profile-panel">
                  {/* Hero */}
                  <div className="profile-panel__hero">
                    <div className="profile-panel__avatar-wrap">
                      <div className="profile-panel__avatar">{userInitials}</div>
                      <span className="profile-panel__online-dot" />
                    </div>
                    <div className="profile-panel__info">
                      <strong>{userEmail ? userEmail.split("@")[0] : "Usuário"}</strong>
                      <span>{userEmail ?? "—"}</span>
                      <span className="profile-panel__plan">
                        <Shield size={9} /> Studio Free
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="profile-panel__stats">
                    <div className="profile-stat">
                      <span className="profile-stat__value">{tracks.length}</span>
                      <span className="profile-stat__label">Faixas</span>
                    </div>
                    <div className="profile-stat__sep" />
                    <div className="profile-stat">
                      <span className="profile-stat__value">{folders.length}</span>
                      <span className="profile-stat__label">Pastas</span>
                    </div>
                    <div className="profile-stat__sep" />
                    <div className="profile-stat">
                      <span className="profile-stat__value">{tracks.length + folders.length}</span>
                      <span className="profile-stat__label">Total</span>
                    </div>
                  </div>

                  {/* Storage bar */}
                  <div className="profile-panel__storage">
                    <div className="profile-storage__header">
                      <span className="profile-storage__label"><HardDrive size={11} /> Armazenamento</span>
                      <span className="profile-storage__value">{usedMB} MB / {totalMB} MB</span>
                    </div>
                    <div className="profile-storage__bar">
                      <div className="profile-storage__fill" style={{ width: `${storagePercent}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="profile-panel__actions">
                    <button className="profile-action-btn" onClick={() => { setProfileOpen(false); openSettings(); }}>
                      <Settings size={14} /> Configurações
                    </button>
                    <div className="profile-panel__divider" />
                    <button className="profile-action-btn profile-action-btn--danger" onClick={handleSignOut}>
                      <LogOut size={14} /> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

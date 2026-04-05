"use client";

import { useState, useEffect } from "react";
import { X, User, Volume2, HardDrive, Info, ChevronRight, Check } from "lucide-react";
import { useAudioContext } from "@/context/AudioContext";
import { supabase } from "@/lib/supabase";

type Section = "conta" | "reproducao" | "armazenamento" | "sobre";

export function SettingsDrawer() {
  const { isSettingsOpen, closeSettings, tracks, volume, setVolume } = useAudioContext();

  const [activeSection, setActiveSection] = useState<Section>("conta");
  const [displayName, setDisplayName] = useState("Arkiv User");
  const [email, setEmail] = useState("admin@arkiv.studio");
  const [nameSaved, setNameSaved] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [quality, setQuality] = useState<"auto" | "high" | "low">("auto");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const handleSaveName = () => {
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const usedMB = tracks.length * 3;
  const totalMB = 500;
  const storagePercent = Math.min(100, Math.round((usedMB / totalMB) * 100));

  if (!isSettingsOpen) return null;

  const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "conta",         label: "Conta",          icon: <User size={15} /> },
    { id: "reproducao",   label: "Reprodução",      icon: <Volume2 size={15} /> },
    { id: "armazenamento",label: "Armazenamento",   icon: <HardDrive size={15} /> },
    { id: "sobre",        label: "Sobre",            icon: <Info size={15} /> },
  ];

  return (
    <div className="settings-overlay" onClick={closeSettings}>
      <div className="settings-drawer" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-drawer__header">
          <span className="settings-drawer__title">Configurações</span>
          <button className="settings-drawer__close" onClick={closeSettings} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="settings-drawer__body">
          {/* Sidebar nav */}
          <nav className="settings-nav">
            {NAV.map(n => (
              <button
                key={n.id}
                className={`settings-nav__item ${activeSection === n.id ? "is-active" : ""}`}
                onClick={() => setActiveSection(n.id)}
              >
                {n.icon}
                <span>{n.label}</span>
                <ChevronRight size={13} className="settings-nav__arrow" />
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="settings-content">

            {/* CONTA */}
            {activeSection === "conta" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Conta</h3>

                <div className="settings-field">
                  <label className="settings-field__label">Nome de exibição</label>
                  <div className="settings-field__row">
                    <input
                      className="settings-input"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Seu nome"
                    />
                    <button
                      className={`settings-save-btn ${nameSaved ? "is-saved" : ""}`}
                      onClick={handleSaveName}
                    >
                      {nameSaved ? <><Check size={13} /> Salvo</> : "Salvar"}
                    </button>
                  </div>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">E-mail</label>
                  <input className="settings-input settings-input--readonly" value={email} readOnly />
                  <span className="settings-field__hint">Gerenciado pelo provedor de autenticação</span>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">Senha</label>
                  <button className="settings-link-btn" onClick={async () => {
                    await supabase.auth.resetPasswordForEmail(email);
                    alert("E-mail de redefinição enviado!");
                  }}>
                    Enviar e-mail de redefinição de senha →
                  </button>
                </div>
              </div>
            )}

            {/* REPRODUÇÃO */}
            {activeSection === "reproducao" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Reprodução</h3>

                <div className="settings-row">
                  <div className="settings-row__info">
                    <span className="settings-row__label">Reprodução automática</span>
                    <span className="settings-row__sub">Iniciar próxima faixa automaticamente</span>
                  </div>
                  <button
                    className={`settings-toggle ${autoplay ? "is-on" : ""}`}
                    onClick={() => setAutoplay(v => !v)}
                    aria-label="Toggle autoplay"
                  >
                    <span className="settings-toggle__thumb" />
                  </button>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">Volume padrão</label>
                  <div className="settings-volume-row">
                    <Volume2 size={14} style={{ color: "var(--t3)", flexShrink: 0 }} />
                    <div className="settings-slider-track" onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setVolume(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
                    }}>
                      <div className="settings-slider-fill" style={{ width: `${volume * 100}%` }} />
                      <div className="settings-slider-thumb" style={{ left: `${volume * 100}%` }} />
                    </div>
                    <span className="settings-volume-val">{Math.round(volume * 100)}%</span>
                  </div>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">Qualidade de áudio</label>
                  <div className="settings-segmented">
                    {(["auto", "high", "low"] as const).map(q => (
                      <button
                        key={q}
                        className={`settings-segmented__btn ${quality === q ? "is-active" : ""}`}
                        onClick={() => setQuality(q)}
                      >
                        {q === "auto" ? "Auto" : q === "high" ? "Alta" : "Baixa"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ARMAZENAMENTO */}
            {activeSection === "armazenamento" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Armazenamento</h3>

                <div className="settings-storage-card">
                  <div className="settings-storage-bar">
                    <div className="settings-storage-fill" style={{ width: `${storagePercent}%` }} />
                  </div>
                  <div className="settings-storage-meta">
                    <span>{usedMB} MB usados</span>
                    <span>{totalMB - usedMB} MB livres</span>
                  </div>
                  <div className="settings-storage-total">{totalMB} MB — Plano Free</div>
                </div>

                <div className="settings-row">
                  <div className="settings-row__info">
                    <span className="settings-row__label">Faixas</span>
                    <span className="settings-row__sub">{tracks.length} arquivo{tracks.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="settings-row__value">{usedMB} MB</span>
                </div>

                <div className="settings-field" style={{ marginTop: 16 }}>
                  <button className="settings-danger-btn" onClick={() => {
                    if (confirm("Limpar cache local? Os arquivos no servidor não serão afetados.")) {
                      localStorage.clear();
                    }
                  }}>
                    Limpar cache local
                  </button>
                </div>
              </div>
            )}

            {/* SOBRE */}
            {activeSection === "sobre" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Sobre</h3>

                <div className="settings-about-logo">ARKIV</div>
                <p className="settings-about-desc">
                  Arquivo pessoal de áudios, gravações e amostras musicais.
                </p>

                <div className="settings-about-rows">
                  {[
                    { label: "Versão",     value: "0.1.0-beta" },
                    { label: "Plataforma", value: "Next.js + Supabase" },
                    { label: "Região",     value: "us-east-1" },
                  ].map(r => (
                    <div key={r.label} className="settings-row">
                      <span className="settings-row__label">{r.label}</span>
                      <span className="settings-row__value">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

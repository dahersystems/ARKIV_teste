"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Verifique seu email para confirmar a conta.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="var(--green)" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="5" fill="var(--green)" />
            <circle cx="14" cy="14" r="2" fill="var(--bg)" />
          </svg>
          <span>ARKIV</span>
        </div>

        <h1 className="auth-title">
          {mode === "signin" ? "Bem-vindo de volta" : "Criar conta"}
        </h1>
        <p className="auth-subtitle">
          {mode === "signin" ? "Entre para acessar seu arquivo" : "Comece a guardar suas músicas"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading && <Loader2 size={15} className="animate-spin" />}
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(null); setSuccess(null); }}
        >
          {mode === "signin" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}

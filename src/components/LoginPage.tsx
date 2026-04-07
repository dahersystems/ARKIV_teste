"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Mail, Lock, Loader2 } from "lucide-react";

type Tab = "login" | "register";

export function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const reset = () => { setError(null); setSuccess(null); setForgotSent(false); };

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    reset();
    if (regPassword !== regConfirm) { setError("As senhas não coincidem."); return; }
    if (regPassword.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: { data: { username: regUsername.trim() || regEmail.split("@")[0] } },
      });
      if (error) throw error;
      setSuccess("Conta criada! Verifique seu email para confirmar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) { setError("Digite seu email acima primeiro."); return; }
    reset();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail);
      if (error) throw error;
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="12" stroke="var(--green)" strokeWidth="1.5" />
            <circle cx="13" cy="13" r="4.5" fill="var(--green)" />
            <circle cx="13" cy="13" r="1.8" fill="var(--bg)" />
          </svg>
          <span>ARKIV</span>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login" ? "auth-tab--active" : ""}`}
            onClick={() => { setTab("login"); reset(); }}
          >
            LOGIN
          </button>
          <button
            className={`auth-tab ${tab === "register" ? "auth-tab--active" : ""}`}
            onClick={() => { setTab("register"); reset(); }}
          >
            REGISTER
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === "login" && (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <div className="auth-field">
              <User size={15} className="auth-field__icon" />
              <input
                className="auth-field__input"
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <Lock size={15} className="auth-field__icon" />
              <input
                className="auth-field__input"
                type="password"
                placeholder="Senha"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="auth-msg auth-msg--error">{error}</p>}
            {forgotSent && <p className="auth-msg auth-msg--success">Email de recuperação enviado!</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Entrar
            </button>

            <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={loading}>
              Esqueci a senha
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === "register" && (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <div className="auth-field">
              <User size={15} className="auth-field__icon" />
              <input
                className="auth-field__input"
                type="text"
                placeholder="Nome de usuário"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="auth-field">
              <Mail size={15} className="auth-field__icon" />
              <input
                className="auth-field__input"
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <Lock size={15} className="auth-field__icon" />
              <input
                className="auth-field__input"
                type="password"
                placeholder="Senha"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="auth-field">
              <Lock size={15} className="auth-field__icon" />
              <input
                className="auth-field__input"
                type="password"
                placeholder="Confirmar senha"
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="auth-msg auth-msg--error">{error}</p>}
            {success && <p className="auth-msg auth-msg--success">{success}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Criar conta
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

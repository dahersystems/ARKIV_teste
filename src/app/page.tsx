"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { LoginPage } from "@/components/LoginPage";
import { Header } from "@/components/Header";
import { ArchiveGrid } from "@/components/ArchiveGrid";
import { FabMenu } from "@/components/FabMenu";
import { UploadModal } from "@/components/UploadModal";
import { RecordingDrawer } from "@/components/RecordingDrawer";
import { CreateFolderModal } from "@/components/CreateFolderModal";
import { PlayerBar } from "@/components/PlayerBar";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { AudioProvider } from "@/context/AudioContext";

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) return null; // loading session
  if (!user) return <LoginPage />;

  return (
    <AudioProvider>
      <Header />
      <ArchiveGrid />
      <FabMenu />
      <UploadModal />
      <CreateFolderModal />
      <RecordingDrawer />
      <PlayerBar />
      <SettingsDrawer />
    </AudioProvider>
  );
}

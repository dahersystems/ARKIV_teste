"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { ArchiveGrid } from "@/components/ArchiveGrid";
import { FabMenu } from "@/components/FabMenu";
import { UploadModal } from "@/components/UploadModal";
import { RecordingDrawer } from "@/components/RecordingDrawer";
import { CreateFolderModal } from "@/components/CreateFolderModal";
import { AudioProvider } from "@/context/AudioContext";

export default function Home() {
  return (
    <AudioProvider>
      <Header />
      <ArchiveGrid />
      <FabMenu />
      <UploadModal />
      <CreateFolderModal />
      <RecordingDrawer />
    </AudioProvider>
  );
}

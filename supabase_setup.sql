-- ================================================================
-- ARKIV – Supabase setup
-- Segurança: RLS baseado em user_id (auth.uid()), sem acesso público
-- ================================================================

-- 1. Tabela de faixas
CREATE TABLE public.tracks (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name       TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  type       TEXT         NOT NULL CHECK (type IN ('track', 'project', 'sample', 'record')),
  status     TEXT         NOT NULL CHECK (status IN ('ready', 'processing', 'recording')),
  audio_url  TEXT,
  folder_id  UUID,
  created_at TIMESTAMPTZ  DEFAULT now() NOT NULL
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracks: select own"  ON public.tracks FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "tracks: insert own"  ON public.tracks FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tracks: update own"  ON public.tracks FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "tracks: delete own"  ON public.tracks FOR DELETE  USING (auth.uid() = user_id);

-- 2. Tabela de pastas
CREATE TABLE public.folders (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name       TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ  DEFAULT now() NOT NULL
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders: select own"  ON public.folders FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "folders: insert own"  ON public.folders FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders: update own"  ON public.folders FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "folders: delete own"  ON public.folders FOR DELETE  USING (auth.uid() = user_id);

-- FK de tracks → folders
ALTER TABLE public.tracks
  ADD CONSTRAINT tracks_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;

-- 3. Bucket de áudio — privado por padrão
INSERT INTO storage.buckets (id, name, public)
VALUES ('arkiv-audio', 'arkiv-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Leitura: somente o dono do arquivo (path começa com user_id/)
CREATE POLICY "storage: select own audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'arkiv-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Upload: somente autenticado, somente no próprio diretório
CREATE POLICY "storage: insert own audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'arkiv-audio'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Atualização: somente o dono
CREATE POLICY "storage: update own audio" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'arkiv-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Deleção: somente o dono
CREATE POLICY "storage: delete own audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'arkiv-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

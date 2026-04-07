-- ================================================================
-- ARKIV – Supabase setup
-- Segurança: RLS baseado em user_id (auth.uid()), sem acesso público
-- ================================================================
-- NOTE: Run sections in order. For existing DBs, use only the
-- "Phase 2 additions" block at the bottom.

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

-- ================================================================
-- PHASE 2 – Cover art, versioning, share links
-- Run this block on existing databases to add the new features.
-- ================================================================

-- 4. Cover art column
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 5. Cover images bucket (public – needed for card display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('arkiv-covers', 'arkiv-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "covers: select public" ON storage.objects
  FOR SELECT USING (bucket_id = 'arkiv-covers');

CREATE POLICY "covers: insert own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'arkiv-covers'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "covers: update own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'arkiv-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "covers: delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'arkiv-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Track versions
CREATE TABLE IF NOT EXISTS public.track_versions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id   UUID        NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  label      TEXT        NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  audio_url  TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.track_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versions: select own" ON public.track_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "versions: insert own" ON public.track_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "versions: delete own" ON public.track_versions FOR DELETE USING (auth.uid() = user_id);

-- 7. Share links
CREATE TABLE IF NOT EXISTS public.share_links (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id   UUID        NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  token      UUID        DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  share_type TEXT        NOT NULL DEFAULT 'full' CHECK (share_type IN ('full', 'clip')),
  clip_start FLOAT,
  clip_end   FLOAT,
  signed_url TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares: select own"  ON public.share_links FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "shares: insert own"  ON public.share_links FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shares: delete own"  ON public.share_links FOR DELETE  USING (auth.uid() = user_id);

-- 8. Public RPC to resolve a share token (callable by anon, no user data exposed)
CREATE OR REPLACE FUNCTION public.get_share_by_token(p_token UUID)
RETURNS TABLE (
  track_name  TEXT,
  cover_url   TEXT,
  signed_url  TEXT,
  share_type  TEXT,
  clip_start  FLOAT,
  clip_end    FLOAT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.name        AS track_name,
    t.cover_url   AS cover_url,
    s.signed_url  AS signed_url,
    s.share_type  AS share_type,
    s.clip_start  AS clip_start,
    s.clip_end    AS clip_end
  FROM share_links s
  JOIN tracks t ON t.id = s.track_id
  WHERE s.token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_by_token(UUID) TO anon;

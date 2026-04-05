-- 1. Criação da tabela de faixas (Tracks)
CREATE TABLE public.tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('track', 'project', 'sample', 'record')),
  status TEXT NOT NULL CHECK (status IN ('ready', 'processing', 'recording')),
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS mas deixar público para o MVP
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública" ON public.tracks
FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública" ON public.tracks
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública" ON public.tracks
FOR UPDATE USING (true);

CREATE POLICY "Permitir deleção pública" ON public.tracks
FOR DELETE USING (true);


-- 2. Criação do Bucket de Armazenamento para os Áudios
-- Crie o bucket "arkiv-audio" manualmente no painel do Supabase ou via script se permitido:
INSERT INTO storage.buckets (id, name, public) VALUES ('arkiv-audio', 'arkiv-audio', true);

-- Políticas de segurança do Storage (Tudo público para o MVP)
CREATE POLICY "Leitura pública de áudios" ON storage.objects
FOR SELECT USING (bucket_id = 'arkiv-audio');

CREATE POLICY "Upload público de áudios" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'arkiv-audio');

CREATE POLICY "Atualização pública de áudios" ON storage.objects
FOR UPDATE USING (bucket_id = 'arkiv-audio');

CREATE POLICY "Deleção pública de áudios" ON storage.objects
FOR DELETE USING (bucket_id = 'arkiv-audio');

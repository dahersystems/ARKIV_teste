-- Execute este SQL no seu painel do Supabase -> SQL Editor (Para adicionar o suporte a pastas)

CREATE TABLE public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Permissões públicas para Folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de pastas" ON public.folders FOR SELECT USING (true);
CREATE POLICY "Criação de pastas" ON public.folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização de pastas" ON public.folders FOR UPDATE USING (true);
CREATE POLICY "Deleção de pastas" ON public.folders FOR DELETE USING (true);


-- Adicionar a referência as tracks dizendo a qual pasta a musica pertence
ALTER TABLE public.tracks ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE;

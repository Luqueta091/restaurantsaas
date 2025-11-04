-- Adicionar coluna evolution_instance_name na tabela restaurants
ALTER TABLE public.restaurants 
ADD COLUMN evolution_instance_name TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.restaurants.evolution_instance_name IS 'Nome da instância da Evolution API para este restaurante';
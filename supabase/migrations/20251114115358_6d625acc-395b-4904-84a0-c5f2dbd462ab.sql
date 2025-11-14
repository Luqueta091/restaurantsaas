-- Adicionar colunas para armazenar métricas de prova social
ALTER TABLE public.dashboard_config
ADD COLUMN IF NOT EXISTS proof_customers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proof_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proof_conversion_rate NUMERIC DEFAULT 8.5;
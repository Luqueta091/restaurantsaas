-- Adicionar campo de retry_count na tabela scheduled_message_recipients
ALTER TABLE public.scheduled_message_recipients
ADD COLUMN retry_count integer DEFAULT 0;

-- Adicionar campo last_retry_at para controlar tempo entre retries
ALTER TABLE public.scheduled_message_recipients
ADD COLUMN last_retry_at timestamp with time zone;
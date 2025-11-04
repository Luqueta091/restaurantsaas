-- Criar tabela de mensagens agendadas
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  template_name TEXT,
  message TEXT NOT NULL,
  media_url TEXT,
  delay_seconds INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela de destinatários de mensagens agendadas
CREATE TABLE IF NOT EXISTS public.scheduled_message_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_message_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_message_recipients ENABLE ROW LEVEL SECURITY;

-- Policies para scheduled_messages
CREATE POLICY "Restaurantes podem ver suas mensagens agendadas"
  ON public.scheduled_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = scheduled_messages.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem criar mensagens agendadas"
  ON public.scheduled_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = scheduled_messages.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem atualizar suas mensagens agendadas"
  ON public.scheduled_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = scheduled_messages.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Policies para scheduled_message_recipients
CREATE POLICY "Restaurantes podem ver destinatários"
  ON public.scheduled_message_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_messages
      JOIN restaurants ON restaurants.id = scheduled_messages.restaurant_id
      WHERE scheduled_messages.id = scheduled_message_recipients.scheduled_message_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem criar destinatários"
  ON public.scheduled_message_recipients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scheduled_messages
      JOIN restaurants ON restaurants.id = scheduled_messages.restaurant_id
      WHERE scheduled_messages.id = scheduled_message_recipients.scheduled_message_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Sistema pode atualizar destinatários"
  ON public.scheduled_message_recipients
  FOR UPDATE
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
  BEFORE UPDATE ON public.scheduled_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON public.scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON public.scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_message_recipients_scheduled_message_id ON public.scheduled_message_recipients(scheduled_message_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_message_recipients_status ON public.scheduled_message_recipients(status);
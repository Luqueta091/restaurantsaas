-- Criar tabelas principais do sistema

-- Tabela de restaurantes
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp_number TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  birthday DATE,
  last_order TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  template_name TEXT,
  variables JSONB,
  media_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('queued','sent','failed','delivered')) DEFAULT 'queued',
  via TEXT DEFAULT 'n8n'
);

-- Tabela de pontos de fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  level TEXT CHECK (level IN ('bronze','silver','gold','platinum')) DEFAULT 'bronze',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de métricas de engajamento
CREATE TABLE IF NOT EXISTS public.engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  messages_sent INTEGER DEFAULT 0,
  messages_opened INTEGER DEFAULT 0,
  orders_after_promo INTEGER DEFAULT 0,
  score FLOAT DEFAULT 0,
  last_computed TIMESTAMPTZ DEFAULT now()
);

-- Tabela de mídias
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS em todas as tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para restaurants
CREATE POLICY "Usuários podem ver seus próprios restaurantes"
  ON public.restaurants FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Usuários podem criar seus próprios restaurantes"
  ON public.restaurants FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Usuários podem atualizar seus próprios restaurantes"
  ON public.restaurants FOR UPDATE
  USING (auth.uid() = owner_id);

-- Políticas RLS para customers
CREATE POLICY "Restaurantes podem ver seus clientes"
  ON public.customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = customers.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Restaurantes podem criar clientes"
  ON public.customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Restaurantes podem atualizar seus clientes"
  ON public.customers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = customers.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

-- Políticas RLS para messages
CREATE POLICY "Restaurantes podem ver suas mensagens"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = messages.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Restaurantes podem criar mensagens"
  ON public.messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

-- Políticas RLS para loyalty_points
CREATE POLICY "Restaurantes podem ver pontos de fidelidade"
  ON public.loyalty_points FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = loyalty_points.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

-- Políticas RLS para engagement_metrics
CREATE POLICY "Restaurantes podem ver métricas de engajamento"
  ON public.engagement_metrics FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = engagement_metrics.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

-- Políticas RLS para media
CREATE POLICY "Restaurantes podem ver suas mídias"
  ON public.media FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = media.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

-- Trigger para atualizar updated_at em restaurants
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_customers_restaurant_id ON public.customers(restaurant_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_messages_restaurant_id ON public.messages(restaurant_id);
CREATE INDEX idx_messages_customer_id ON public.messages(customer_id);
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at DESC);
CREATE INDEX idx_loyalty_points_customer_id ON public.loyalty_points(customer_id);
CREATE INDEX idx_engagement_metrics_customer_id ON public.engagement_metrics(customer_id);
CREATE INDEX idx_engagement_metrics_score ON public.engagement_metrics(score DESC);
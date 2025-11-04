-- Índice para busca de clientes por telefone (usado no webhook)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Índice para busca de mensagens por restaurante e data
CREATE INDEX IF NOT EXISTS idx_messages_restaurant_sent_at ON public.messages(restaurant_id, sent_at DESC);

-- Índice para busca de pedidos por cliente e data
CREATE INDEX IF NOT EXISTS idx_orders_customer_created_at ON public.orders(customer_id, created_at DESC);

-- Índice para busca de pedidos por restaurante e status
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);

-- Índice para métricas de engajamento por cliente
CREATE INDEX IF NOT EXISTS idx_engagement_customer ON public.engagement_metrics(customer_id);

-- Índice composto para operações do webhook
CREATE INDEX IF NOT EXISTS idx_customers_phone_restaurant ON public.customers(phone, restaurant_id);
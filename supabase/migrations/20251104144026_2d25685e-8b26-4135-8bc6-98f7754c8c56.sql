-- Criar tabela de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para orders
CREATE POLICY "Restaurantes podem ver seus pedidos"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem criar pedidos"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem atualizar seus pedidos"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar dados do cliente quando um pedido é criado/atualizado
CREATE OR REPLACE FUNCTION public.update_customer_order_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar total_orders e last_order do cliente
  UPDATE public.customers
  SET 
    total_orders = (
      SELECT COUNT(*) 
      FROM public.orders 
      WHERE customer_id = NEW.customer_id
    ),
    last_order = (
      SELECT MAX(created_at) 
      FROM public.orders 
      WHERE customer_id = NEW.customer_id
    )
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar stats após INSERT
CREATE TRIGGER update_customer_stats_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_order_stats();

-- Trigger para atualizar stats após UPDATE
CREATE TRIGGER update_customer_stats_after_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_order_stats();

-- Função para atualizar stats quando pedido é deletado
CREATE OR REPLACE FUNCTION public.update_customer_order_stats_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar total_orders e last_order do cliente
  UPDATE public.customers
  SET 
    total_orders = (
      SELECT COUNT(*) 
      FROM public.orders 
      WHERE customer_id = OLD.customer_id
    ),
    last_order = (
      SELECT MAX(created_at) 
      FROM public.orders 
      WHERE customer_id = OLD.customer_id
    )
  WHERE id = OLD.customer_id;
  
  RETURN OLD;
END;
$$;

-- Trigger para atualizar stats após DELETE
CREATE TRIGGER update_customer_stats_after_delete
  AFTER DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_order_stats_on_delete();

-- Adicionar comentários
COMMENT ON TABLE public.orders IS 'Tabela de pedidos dos clientes';
COMMENT ON COLUMN public.orders.status IS 'Status do pedido: pending, completed, cancelled';
COMMENT ON COLUMN public.orders.total_amount IS 'Valor total do pedido em reais';
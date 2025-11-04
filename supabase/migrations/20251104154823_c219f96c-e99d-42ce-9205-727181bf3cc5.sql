-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscar produtos por restaurante
CREATE INDEX idx_products_restaurant ON public.products(restaurant_id);

-- RLS para produtos (público pode ver, apenas donos podem editar)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver produtos disponíveis
CREATE POLICY "Produtos disponíveis são públicos"
ON public.products
FOR SELECT
USING (available = true);

-- Restaurantes podem ver todos seus produtos
CREATE POLICY "Restaurantes podem ver seus produtos"
ON public.products
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = products.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Restaurantes podem criar produtos
CREATE POLICY "Restaurantes podem criar produtos"
ON public.products
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = products.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Restaurantes podem atualizar seus produtos
CREATE POLICY "Restaurantes podem atualizar produtos"
ON public.products
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = products.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Restaurantes podem deletar seus produtos
CREATE POLICY "Restaurantes podem deletar produtos"
ON public.products
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = products.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de itens do pedido (para detalhar produtos)
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscar itens por pedido
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- RLS para order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Restaurantes podem ver itens de seus pedidos
CREATE POLICY "Restaurantes podem ver itens de pedidos"
ON public.order_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders
  JOIN restaurants ON restaurants.id = orders.restaurant_id
  WHERE orders.id = order_items.order_id
  AND restaurants.owner_id = auth.uid()
));

-- Qualquer um pode criar itens (para pedidos públicos)
CREATE POLICY "Criar itens de pedido"
ON public.order_items
FOR INSERT
WITH CHECK (true);

-- Adicionar campo para identificar pedidos do cardápio digital
ALTER TABLE public.orders
ADD COLUMN source TEXT DEFAULT 'manual';

-- Adicionar campos de endereço de entrega
ALTER TABLE public.orders
ADD COLUMN delivery_address TEXT,
ADD COLUMN delivery_notes TEXT;
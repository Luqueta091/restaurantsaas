-- Tabela para configurações de prova social do dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  monthly_revenue NUMERIC DEFAULT 0,
  revenue_growth_percentage NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para dashboard_config
ALTER TABLE public.dashboard_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurantes podem ver suas configs"
  ON public.dashboard_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = dashboard_config.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem criar suas configs"
  ON public.dashboard_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = dashboard_config.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurantes podem atualizar suas configs"
  ON public.dashboard_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = dashboard_config.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Função para calcular faturamento real dos pedidos
CREATE OR REPLACE FUNCTION calculate_restaurant_revenue(rest_id UUID, period TEXT DEFAULT 'all')
RETURNS TABLE (
  total_revenue NUMERIC,
  period_revenue NUMERIC,
  growth_percentage NUMERIC
) AS $$
DECLARE
  current_period_start TIMESTAMP;
  previous_period_start TIMESTAMP;
  previous_period_end TIMESTAMP;
  current_period_revenue NUMERIC;
  previous_period_revenue NUMERIC;
BEGIN
  -- Define períodos baseado no parâmetro
  IF period = 'month' THEN
    current_period_start := date_trunc('month', now());
    previous_period_start := date_trunc('month', now() - interval '1 month');
    previous_period_end := date_trunc('month', now());
  ELSIF period = 'week' THEN
    current_period_start := date_trunc('week', now());
    previous_period_start := date_trunc('week', now() - interval '1 week');
    previous_period_end := date_trunc('week', now());
  ELSE
    current_period_start := '-infinity'::timestamp;
    previous_period_start := '-infinity'::timestamp;
    previous_period_end := '-infinity'::timestamp;
  END IF;

  -- Calcula faturamento total
  SELECT COALESCE(SUM(total_amount), 0)
  INTO total_revenue
  FROM orders
  WHERE restaurant_id = rest_id
    AND status NOT IN ('cancelled');

  -- Calcula faturamento do período atual
  SELECT COALESCE(SUM(total_amount), 0)
  INTO current_period_revenue
  FROM orders
  WHERE restaurant_id = rest_id
    AND status NOT IN ('cancelled')
    AND created_at >= current_period_start;

  -- Calcula faturamento do período anterior
  SELECT COALESCE(SUM(total_amount), 0)
  INTO previous_period_revenue
  FROM orders
  WHERE restaurant_id = rest_id
    AND status NOT IN ('cancelled')
    AND created_at >= previous_period_start
    AND created_at < previous_period_end;

  -- Calcula crescimento percentual
  IF previous_period_revenue > 0 THEN
    growth_percentage := ((current_period_revenue - previous_period_revenue) / previous_period_revenue) * 100;
  ELSE
    growth_percentage := 0;
  END IF;

  period_revenue := current_period_revenue;

  RETURN QUERY SELECT total_revenue, period_revenue, growth_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
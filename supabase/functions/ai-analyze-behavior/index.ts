import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analise o comportamento deste cliente de restaurante e forneça insights acionáveis:

Dados do Cliente:
- Total de pedidos: ${customerData.total_orders}
- Último pedido: ${customerData.last_order}
- Mensagens enviadas: ${customerData.messages_sent}
- Taxa de abertura: ${customerData.open_rate}%
- Pedidos após promoção: ${customerData.orders_after_promo}

Forneça:
1. Classificação do cliente (VIP, Frequente, Inativo, Novo)
2. Nível de engajamento (Alto, Médio, Baixo)
3. Recomendações específicas de campanhas
4. Melhor horário para enviar mensagens
5. Produtos/promoções recomendados

Responda em formato JSON com as seguintes chaves: classification, engagement, recommendations, best_time, suggested_promotions`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em análise de comportamento de clientes em restaurantes." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao analisar comportamento";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

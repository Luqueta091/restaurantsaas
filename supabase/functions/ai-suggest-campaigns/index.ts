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
    const { restaurantData, customerStats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Com base nos dados abaixo, sugira 5 campanhas de marketing eficazes para este restaurante:

Dados do Restaurante:
- Total de clientes: ${customerStats.total_customers}
- Clientes ativos: ${customerStats.active_customers}
- Taxa de conversão média: ${customerStats.conversion_rate}%
- Ticket médio: R$ ${customerStats.average_ticket}

Contexto adicional:
${restaurantData.context || 'Restaurante de comida caseira, delivery e salão'}

Para cada campanha, forneça:
1. Título atraente
2. Objetivo claro
3. Público-alvo específico
4. Tipo de desconto/promoção
5. Timing recomendado
6. Expectativa de ROI

Responda em formato JSON array com as chaves: title, objective, target_audience, offer, timing, expected_roi`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Você é um especialista em marketing digital para restaurantes, com foco em campanhas de WhatsApp e fidelização de clientes."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign suggestion error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao sugerir campanhas";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetRevenue, days, restaurantId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Generating proof data for:", { targetRevenue, days, restaurantId });

    // Usar IA para gerar estatísticas realistas
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Você é um especialista em métricas de restaurantes e marketing digital. 
Gere estatísticas REALISTAS para um restaurante que quer mostrar crescimento de vendas usando WhatsApp marketing.
As métricas devem ser proporcionais e condizentes com a realidade de negócios de food delivery.`
          },
          {
            role: "user",
            content: `Preciso de estatísticas realistas para um restaurante que usou marketing por WhatsApp durante ${days} dias e alcançou R$${targetRevenue} de faturamento.

Retorne APENAS o JSON com estas estatísticas proporcionais e realistas:
- totalCustomers: número de clientes únicos (considere ticket médio de R$35-50)
- messagesSent: mensagens de marketing enviadas (deve ser proporcional aos clientes, considere 3-5 mensagens por cliente)
- conversionRate: taxa de conversão em porcentagem (geralmente 8-15% para WhatsApp marketing)
- revenueGrowthPercentage: crescimento percentual realista para o período (considere ${days} dias)

Use apenas números inteiros para customers e messages. Use números decimais com 1 casa para taxas.
Formato: {"totalCustomers": X, "messagesSent": Y, "conversionRate": Z, "revenueGrowthPercentage": W}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_metrics",
              description: "Gera métricas realistas de marketing e vendas",
              parameters: {
                type: "object",
                properties: {
                  totalCustomers: {
                    type: "integer",
                    description: "Total de clientes únicos"
                  },
                  messagesSent: {
                    type: "integer",
                    description: "Total de mensagens de marketing enviadas"
                  },
                  conversionRate: {
                    type: "number",
                    description: "Taxa de conversão em porcentagem (ex: 12.5)"
                  },
                  revenueGrowthPercentage: {
                    type: "number",
                    description: "Percentual de crescimento de faturamento"
                  }
                },
                required: ["totalCustomers", "messagesSent", "conversionRate", "revenueGrowthPercentage"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_metrics" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      throw new Error(`Lovable AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const metrics = JSON.parse(toolCall.function.arguments);
    console.log("Generated metrics:", metrics);

    // Gerar dados diários com crescimento gradual
    const dailyData = generateDailyRevenue(targetRevenue, days);

    // Salvar configuração no banco
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: existing } = await supabase
      .from("dashboard_config")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    const configData = {
      restaurant_id: restaurantId,
      total_revenue: targetRevenue,
      monthly_revenue: targetRevenue,
      revenue_growth_percentage: metrics.revenueGrowthPercentage,
      proof_customers: metrics.totalCustomers,
      proof_messages: metrics.messagesSent,
      proof_conversion_rate: metrics.conversionRate,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from("dashboard_config")
        .update(configData)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("dashboard_config")
        .insert(configData);
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics: {
          totalCustomers: metrics.totalCustomers,
          messagesSent: metrics.messagesSent,
          conversionRate: `${metrics.conversionRate.toFixed(1)}%`,
          revenueGrowthPercentage: metrics.revenueGrowthPercentage,
        },
        dailyData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating proof data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateDailyRevenue(totalRevenue: number, days: number): { date: string; revenue: number }[] {
  const result = [];
  const today = new Date();
  
  // Começar com 30% do valor final e crescer gradualmente
  const startRevenue = totalRevenue * 0.3;
  const growthPerDay = (totalRevenue - startRevenue) / days;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - i - 1));
    
    // Crescimento com variação realista (adicionar aleatoriedade de ±10%)
    const baseRevenue = startRevenue + (growthPerDay * i);
    const variation = baseRevenue * (Math.random() * 0.2 - 0.1); // -10% a +10%
    const dailyRevenue = Math.max(0, baseRevenue + variation);
    
    result.push({
      date: date.toISOString().split("T")[0],
      revenue: Math.round(dailyRevenue * 100) / 100, // 2 casas decimais
    });
  }
  
  return result;
}
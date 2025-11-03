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
    const { campaignType, customerName, customData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompts: Record<string, string> = {
      birthday: `Crie uma mensagem de aniversário calorosa e personalizada para ${customerName}. Inclua um desconto especial de aniversário. Seja amigável e comemorativo.`,
      welcome: `Crie uma mensagem de boas-vindas para ${customerName}, um novo cliente. Explique sobre o programa de fidelidade e ofereça um desconto de primeira compra.`,
      winback: `Crie uma mensagem para reengajar ${customerName}, que não faz pedidos há algum tempo. Seja empático e ofereça um incentivo atraente para voltar.`,
      promotion: `Crie uma mensagem promocional empolgante para ${customerName} sobre: ${customData?.promotion || 'promoção especial'}. Destaque benefícios e crie senso de urgência.`,
      loyalty: `Crie uma mensagem agradecendo ${customerName} pela fidelidade. Destaque quantos pedidos já fizeram e ofereça uma recompensa exclusiva.`,
    };

    const prompt = prompts[campaignType] || prompts.promotion;

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
            content: "Você é um especialista em marketing de restaurantes. Crie mensagens curtas (máximo 160 caracteres), envolventes e personalizadas para WhatsApp."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Message generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao gerar mensagem";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

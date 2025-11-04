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
    const { message, customerName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('Processing message with Lovable AI:', message);

    // Use Lovable AI to classify intent and generate response
    const aiPrompt = `Você é um assistente de atendimento ao cliente de um delivery de comida.

Analise a mensagem do cliente e identifique a intenção principal:
- fazer_pedido: cliente quer fazer um pedido
- reclamacao: cliente está reclamando
- elogio: cliente está elogiando
- horario: pergunta sobre horário de funcionamento
- promocao: pergunta sobre promoções
- endereco: pergunta sobre endereço/localização
- pagamento: pergunta sobre formas de pagamento
- status_pedido: pergunta sobre status do pedido
- outro: outras intenções

Mensagem do cliente ${customerName}: "${message}"

Responda em JSON com:
{
  "intent": "uma das opções acima",
  "confidence": número entre 0 e 1,
  "response": "resposta amigável e útil em português"
}

Regras para a resposta:
- Se for fazer_pedido: pergunte o que deseja
- Se for reclamacao: peça desculpas e ofereça ajuda
- Se for elogio: agradeça carinhosamente
- Se for horario: informe "segunda a sexta 11h-23h, finais de semana 12h-00h"
- Se for promocao: mencione promoções semanais
- Se for status_pedido: ofereça verificar o pedido
- Seja breve, simpático e use emojis apropriados`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse JSON response
    let jsonText = aiContent.trim();
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      jsonText = lines.slice(1, -1).join('\n');
      if (jsonText.startsWith('json')) {
        jsonText = jsonText.substring(4).trim();
      }
    }
    
    const result = JSON.parse(jsonText);
    
    console.log('AI Analysis:', result);

    const responseText = result.response || `Olá ${customerName}! Como posso te ajudar hoje?`;

    return new Response(
      JSON.stringify({ 
        success: true,
        intent: result.intent,
        confidence: result.confidence,
        response: responseText
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in AI customer service:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: 'Desculpe, estou com dificuldade para processar sua mensagem. Um atendente humano vai te responder em breve!'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

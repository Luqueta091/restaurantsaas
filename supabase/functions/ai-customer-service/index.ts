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
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    console.log('Processing message with Gemini:', message);

    // Use Gemini for intent classification and response generation
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

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`json) neste formato:
{
  "intent": "uma das opções acima",
  "confidence": número entre 0 e 1,
  "response": "resposta amigável e útil em português brasileiro"
}

Regras para a resposta:
- Se for fazer_pedido: pergunte o que deseja com entusiasmo 🍕
- Se for reclamacao: peça desculpas e ofereça ajuda imediata 😔
- Se for elogio: agradeça carinhosamente 🥰
- Se for horario: informe "segunda a sexta 11h-23h, finais de semana 12h-00h" 🕐
- Se for promocao: mencione promoções semanais e ofereça cardápio 🎉
- Se for status_pedido: ofereça verificar o pedido ⏳
- Seja breve, simpático e use emojis apropriados`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: aiPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Raw Gemini response:', aiData);
    
    const generatedText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    let jsonText = generatedText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    }
    
    // Try to find JSON object in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonText);
      // Fallback response
      result = {
        intent: 'outro',
        confidence: 0.5,
        response: `Olá ${customerName}! Estou aqui para te ajudar. Pode me contar mais sobre o que você precisa?`
      };
    }
    
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

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
    const HF_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

    if (!HF_TOKEN) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN not configured');
    }

    console.log('Processing message with Qwen3-8B:', message);

    // Use Qwen3-8B for intent classification and response generation
    const aiPrompt = `<|im_start|>system
Você é um assistente de atendimento ao cliente de um delivery de comida.

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

Responda APENAS em JSON válido com:
{
  "intent": "uma das opções acima",
  "confidence": número entre 0 e 1,
  "response": "resposta amigável e útil em português brasileiro"
}

Regras para a resposta:
- Se for fazer_pedido: pergunte o que deseja com entusiasmo
- Se for reclamacao: peça desculpas e ofereça ajuda imediata
- Se for elogio: agradeça carinhosamente
- Se for horario: informe "segunda a sexta 11h-23h, finais de semana 12h-00h"
- Se for promocao: mencione promoções semanais e ofereça cardápio
- Se for status_pedido: ofereça verificar o pedido
- Seja breve, simpático e use emojis apropriados<|im_end|>
<|im_start|>user
Mensagem do cliente ${customerName}: "${message}"<|im_end|>
<|im_start|>assistant`;

    const aiResponse = await fetch(
      'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
      {
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: aiPrompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Hugging Face error:', aiResponse.status, errorText);
      throw new Error(`Hugging Face API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Raw AI response:', aiData);
    
    let generatedText = '';
    if (Array.isArray(aiData)) {
      generatedText = aiData[0]?.generated_text || '';
    } else {
      generatedText = aiData.generated_text || '';
    }

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

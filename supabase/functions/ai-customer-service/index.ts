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

    console.log('Processing message with HuggingFace:', message);

    // Classify message intent
    const intentResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
      {
        headers: { 
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify({
          inputs: message,
          parameters: {
            candidate_labels: [
              "fazer pedido",
              "reclamação",
              "elogio",
              "horário de funcionamento",
              "promoção",
              "endereço",
              "forma de pagamento",
              "status do pedido"
            ],
          },
        }),
      }
    );

    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      console.error('HuggingFace intent error:', intentResponse.status, errorText);
      throw new Error(`HuggingFace API error: ${intentResponse.status}`);
    }

    const intentData = await intentResponse.json();
    const topIntent = intentData?.labels?.[0] || 'unknown';
    const confidence = intentData?.scores?.[0] || 0;

    console.log('Intent detected:', topIntent, 'Confidence:', confidence);

    let responseText = '';

    // Generate responses based on intent
    if (topIntent === "fazer pedido") {
      responseText = `Olá ${customerName}! 🍕 Que ótimo que quer fazer um pedido! Pode me dizer o que gostaria?`;
    } else if (topIntent === "reclamação") {
      responseText = `Olá ${customerName}, sinto muito pelo inconveniente. 😔 Pode me contar o que aconteceu para eu resolver rapidamente?`;
    } else if (topIntent === "elogio") {
      responseText = `Muito obrigado pelo carinho, ${customerName}! 🥰 Ficamos muito felizes em saber que você gostou!`;
    } else if (topIntent === "horário de funcionamento") {
      responseText = `Olá ${customerName}! Nosso horário de funcionamento é de segunda a sexta das 11h às 23h, e finais de semana das 12h às 00h. 🕐`;
    } else if (topIntent === "promoção") {
      responseText = `Oi ${customerName}! 🎉 Temos promoções especiais toda semana! Quer que eu te envie nosso cardápio com os preços?`;
    } else if (topIntent === "status do pedido") {
      responseText = `Olá ${customerName}! Vou verificar o status do seu pedido. Um momento por favor... ⏳`;
    } else {
      // Use text generation model for other cases
      const generationPrompt = `Você é um atendente simpático de um delivery de comida. O cliente ${customerName} disse: "${message}". Responda de forma educada, breve e útil em português brasileiro.`;
      
      const generationResponse = await fetch(
        "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2",
        {
          headers: { 
            Authorization: `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json'
          },
          method: "POST",
          body: JSON.stringify({ 
            inputs: generationPrompt,
            parameters: {
              max_new_tokens: 150,
              temperature: 0.7,
              return_full_text: false
            }
          }),
        }
      );

      if (generationResponse.ok) {
        const generationData = await generationResponse.json();
        responseText = generationData[0]?.generated_text || `Olá ${customerName}! Como posso te ajudar hoje?`;
      } else {
        responseText = `Olá ${customerName}! Como posso te ajudar hoje?`;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        intent: topIntent,
        confidence: confidence,
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

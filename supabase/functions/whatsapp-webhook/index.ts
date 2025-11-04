import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));
    
    // Processar em background (sem await para resposta rápida)
    handleMessage(payload).catch(error => {
      console.error('Background processing error:', error);
    });
    
    // Responder imediatamente ao Evolution (200 OK)
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received and processing' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Palavras-chave para detecção rápida de pedidos (sem IA)
const ORDER_KEYWORDS = [
  'pedido', 'comprar', 'quero', 'gostaria', 'preço', 'valor', 
  'entregar', 'delivery', 'cardápio', 'menu', 'pedir'
];

// Palavras-chave de confirmação do restaurante (cria pedido direto)
const RESTAURANT_CONFIRMATION_KEYWORDS = [
  'seu pedido está sendo feito',
  'pedido confirmado',
  'pedido em preparo',
  'estamos preparando seu pedido',
  'pedido aceito'
];

// Mensagens ignoradas (não precisa processar)
const IGNORE_PATTERNS = [
  /^(oi|olá|ok|obrigad[oa]|valeu|tá|sim|não)$/i,
  /^.{1,3}$/  // Mensagens muito curtas
];

function shouldIgnoreMessage(text: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(text.trim()));
}

function hasOrderKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ORDER_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function isRestaurantConfirmation(text: string): boolean {
  const lowerText = text.toLowerCase();
  return RESTAURANT_CONFIRMATION_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function handleMessage(payload: any) {
  // Verificar se é uma mensagem recebida (não enviada por nós)
  if (!payload.data?.key?.fromMe && payload.data?.message) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const phoneNumber = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = payload.data.message.conversation || 
                       payload.data.message.extendedTextMessage?.text || '';
    
    console.log('Processing message from:', phoneNumber, 'Text:', messageText);

    // FILTRO 1: Ignorar mensagens muito curtas ou sem sentido
    if (shouldIgnoreMessage(messageText)) {
      console.log('Message ignored (too short or generic)');
      return;
    }

    // Buscar cliente e restaurante
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, restaurant_id, restaurants(whatsapp_number)')
      .ilike('phone', `%${phoneNumber}%`)
      .limit(1);

    if (customerError || !customers || customers.length === 0) {
      console.log('Customer not found for phone:', phoneNumber);
      return;
    }

    const customer = customers[0];
    const restaurantWhatsapp = customer.restaurants?.whatsapp_number;
    console.log('Customer found:', customer);

    // CAMINHO 1: Mensagem do restaurante confirmando pedido (SEM IA)
    if (restaurantWhatsapp && phoneNumber.includes(restaurantWhatsapp.replace(/\D/g, ''))) {
      if (isRestaurantConfirmation(messageText)) {
        console.log('Restaurant confirmation detected - creating order directly');
        
        // Extrair número do pedido se tiver
        const orderNumberMatch = messageText.match(/#?(\d+)/);
        const orderNumber = orderNumberMatch ? orderNumberMatch[1] : `WPP-${Date.now()}`;
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: customer.id,
            restaurant_id: customer.restaurant_id,
            order_number: orderNumber,
            total_amount: 0,
            status: 'confirmed',
            notes: `Confirmação do restaurante: ${messageText}`,
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
          throw orderError;
        }

        console.log('Order created from restaurant confirmation:', order);
        return;
      }
    }

    // FILTRO 2: Verificar se tem palavras-chave de pedido
    if (!hasOrderKeywords(messageText)) {
      console.log('No order keywords detected - skipping AI analysis');
      return;
    }

    // CAMINHO 2: Mensagem do cliente com palavras-chave (USA IA)
    console.log('Order keywords detected - analyzing with AI');
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const aiPrompt = `Analise a seguinte mensagem de WhatsApp e determine se é um pedido de restaurante.
Se for um pedido, extraia:
- orderNumber: número do pedido (se mencionado)
- totalAmount: valor total em reais (apenas o número, sem R$)
- notes: observações ou itens do pedido

Mensagem: "${messageText}"

Responda APENAS com um JSON válido neste formato:
{"isOrder": true/false, "orderNumber": "string ou null", "totalAmount": number ou null, "notes": "string"}

Se não for um pedido, retorne: {"isOrder": false, "orderNumber": null, "totalAmount": null, "notes": null}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
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
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', aiData);

    const aiMessage = aiData.choices[0].message.content;
    
    // Extrair JSON de dentro de blocos markdown se necessário
    let jsonText = aiMessage.trim();
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      jsonText = lines.slice(1, -1).join('\n');
    }
    
    const orderInfo = JSON.parse(jsonText);
    
    console.log('Order info extracted:', orderInfo);

    if (orderInfo.isOrder) {
      // Criar pedido automaticamente
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          restaurant_id: customer.restaurant_id,
          order_number: orderInfo.orderNumber || `WPP-${Date.now()}`,
          total_amount: orderInfo.totalAmount || 0,
          status: 'pending',
          notes: orderInfo.notes || `Pedido via WhatsApp: ${messageText}`,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      console.log('Order created:', order);
    }
  }
}

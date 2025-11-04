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

    // Verificar se é uma mensagem recebida (não enviada por nós)
    if (!payload.data?.key?.fromMe && payload.data?.message) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const phoneNumber = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
      const messageText = payload.data.message.conversation || 
                         payload.data.message.extendedTextMessage?.text || '';
      
      console.log('Processing message from:', phoneNumber, 'Text:', messageText);

      // Buscar cliente pelo telefone
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, name, restaurant_id')
        .ilike('phone', `%${phoneNumber}%`)
        .limit(1);

      if (customerError || !customers || customers.length === 0) {
        console.log('Customer not found for phone:', phoneNumber);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Customer not found' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const customer = customers[0];
      console.log('Customer found:', customer);

      // Usar IA para detectar se é um pedido e extrair informações
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

      const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            { role: 'user', content: aiPrompt }
          ],
        }),
      });

      const aiData = await aiResponse.json();
      console.log('AI Response:', aiData);

      const aiMessage = aiData.choices[0].message.content;
      const orderInfo = JSON.parse(aiMessage);
      
      console.log('Order info extracted:', orderInfo);

      if (orderInfo.isOrder && orderInfo.totalAmount) {
        // Criar pedido automaticamente
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: customer.id,
            restaurant_id: customer.restaurant_id,
            order_number: orderInfo.orderNumber || `WPP-${Date.now()}`,
            total_amount: orderInfo.totalAmount,
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

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Order created',
          order 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Message processed but not an order' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
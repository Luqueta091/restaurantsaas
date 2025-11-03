import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, restaurantId, templateName, message, mediaUrl } = await req.json();
    
    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do cliente
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Cliente não encontrado');
    }

    // Buscar dados do restaurante
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      throw new Error('Restaurante não encontrado');
    }

    // Preparar payload para n8n
    const n8nPayload = {
      to: customer.phone,
      message: message,
      customerName: customer.name,
      restaurantName: restaurant.name,
      templateName: templateName,
      mediaUrl: mediaUrl || null,
    };

    console.log('Enviando para n8n:', n8nPayload);

    // URL do webhook do n8n (configurável via secret)
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
    
    let messageStatus = 'sent';
    
    if (N8N_WEBHOOK_URL) {
      // Enviar para n8n
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!n8nResponse.ok) {
        console.error('Erro ao enviar para n8n:', await n8nResponse.text());
        messageStatus = 'failed';
      } else {
        console.log('Mensagem enviada para n8n com sucesso');
        messageStatus = 'sent';
      }
    } else {
      console.warn('N8N_WEBHOOK_URL não configurado. Mensagem será salva mas não enviada.');
      messageStatus = 'queued';
    }

    // Salvar mensagem no banco de dados
    const { data: savedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        customer_id: customerId,
        restaurant_id: restaurantId,
        template_name: templateName,
        variables: { message },
        media_url: mediaUrl,
        status: messageStatus,
        via: 'n8n',
      })
      .select()
      .single();

    if (messageError) {
      console.error('Erro ao salvar mensagem:', messageError);
      throw messageError;
    }

    // Atualizar métricas de engajamento
    const { data: existingMetrics } = await supabase
      .from('engagement_metrics')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (existingMetrics) {
      await supabase
        .from('engagement_metrics')
        .update({
          messages_sent: (existingMetrics.messages_sent || 0) + 1,
          last_computed: new Date().toISOString(),
        })
        .eq('customer_id', customerId);
    } else {
      await supabase
        .from('engagement_metrics')
        .insert({
          customer_id: customerId,
          restaurant_id: restaurantId,
          messages_sent: 1,
          messages_opened: 0,
          orders_after_promo: 0,
          score: 0,
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: savedMessage,
        n8nConfigured: !!N8N_WEBHOOK_URL,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    // Obter credenciais do Twilio
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      throw new Error('Credenciais do Twilio não configuradas');
    }

    console.log('Enviando mensagem via Twilio para:', customer.phone);

    // Limpar e formatar números no formato WhatsApp (whatsapp:+...)
    const cleanTwilioNumber = TWILIO_WHATSAPP_NUMBER.replace(/\D/g, '');
    const cleanCustomerPhone = customer.phone.replace(/\D/g, '');
    
    const fromNumber = `whatsapp:+${cleanTwilioNumber}`;
    const toNumber = `whatsapp:+${cleanCustomerPhone}`;

    console.log('From:', fromNumber);
    console.log('To:', toNumber);

    // Preparar corpo da requisição (x-www-form-urlencoded)
    const twilioParams = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: message,
    });

    // Adicionar mídia se fornecida
    if (mediaUrl) {
      twilioParams.append('MediaUrl', mediaUrl);
    }

    // Criar autenticação Basic Auth
    const authString = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    let messageStatus = 'sent';
    
    try {
      // Enviar mensagem via Twilio API
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: twilioParams.toString(),
        }
      );

      const twilioResult = await twilioResponse.json();

      if (!twilioResponse.ok) {
        console.error('Erro ao enviar via Twilio:', twilioResult);
        messageStatus = 'failed';
        throw new Error(twilioResult.message || 'Erro ao enviar mensagem via Twilio');
      }

      console.log('Mensagem enviada via Twilio com sucesso:', twilioResult.sid);
      messageStatus = 'sent';
    } catch (error) {
      console.error('Erro ao enviar via Twilio:', error);
      messageStatus = 'failed';
      throw error;
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
        via: 'twilio',
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

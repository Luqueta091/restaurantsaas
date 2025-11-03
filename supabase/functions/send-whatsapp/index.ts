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

    // Obter credenciais da Evolution API
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_TOKEN = Deno.env.get('EVOLUTION_API_TOKEN');
    const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_TOKEN || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Credenciais da Evolution API não configuradas');
    }

    console.log('=== Iniciando envio via Evolution API ===');
    console.log('Cliente:', customer.phone);
    console.log('Evolution API URL:', EVOLUTION_API_URL);
    console.log('Instance Name:', EVOLUTION_INSTANCE_NAME);

    // Limpar e formatar número no formato internacional
    const cleanCustomerPhone = customer.phone.replace(/\D/g, '');
    
    console.log('Número formatado:', cleanCustomerPhone);

    // Preparar corpo da requisição para Evolution API
    const evolutionBody: any = {
      number: cleanCustomerPhone,
      text: message,
    };

    // Adicionar mídia se fornecida
    if (mediaUrl) {
      evolutionBody.mediaUrl = mediaUrl;
    }
    
    console.log('Body da requisição:', JSON.stringify(evolutionBody));
    
    let messageStatus = 'sent';
    
    try {
      const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
      console.log('URL completa:', url);
      console.log('Token presente:', EVOLUTION_API_TOKEN ? 'Sim (primeiros 10 chars: ' + EVOLUTION_API_TOKEN.substring(0, 10) + '...)' : 'Não');
      
      // Enviar mensagem via Evolution API
      const evolutionResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EVOLUTION_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evolutionBody),
      });
      
      console.log('Status da resposta:', evolutionResponse.status);
      console.log('Headers da resposta:', JSON.stringify(Object.fromEntries(evolutionResponse.headers.entries())));

      const contentType = evolutionResponse.headers.get('content-type') || '';
      let evolutionResult: any = null;
      let evolutionRawText: string | null = null;
      try {
        if (contentType.includes('application/json')) {
          evolutionResult = await evolutionResponse.json();
        } else {
          evolutionRawText = await evolutionResponse.text();
          evolutionResult = { raw: evolutionRawText };
        }
      } catch (parseErr) {
        // Fallback in case parsing fails (e.g., HTML error page)
        try {
          evolutionRawText = await evolutionResponse.text();
        } catch {}
        evolutionResult = { raw: evolutionRawText, parseError: String(parseErr) };
      }

      if (!evolutionResponse.ok) {
        console.error('Erro ao enviar via Evolution API:', {
          status: evolutionResponse.status,
          statusText: evolutionResponse.statusText,
          result: evolutionResult,
        });
        messageStatus = 'failed';
        const apiMsg = (evolutionResult && (evolutionResult.message || evolutionResult.error)) || undefined;
        throw new Error(apiMsg || `Erro ao enviar mensagem via Evolution API (status ${evolutionResponse.status})`);
      }

      console.log('Mensagem enviada via Evolution API com sucesso:', evolutionResult);
      messageStatus = 'sent';
    } catch (error) {
      console.error('Erro ao enviar via Evolution API:', error);
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
        via: 'evolution',
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Iniciando processamento de mensagens agendadas...");

    // Buscar mensagens pendentes ou em processamento que já estão no horário de envio
    const now = new Date().toISOString();
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .in("status", ["pending", "processing"])
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true });

    if (fetchError) {
      console.error("Erro ao buscar mensagens:", fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log("Nenhuma mensagem pendente para processar");
      return new Response(
        JSON.stringify({ message: "Nenhuma mensagem pendente", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${pendingMessages.length} mensagens para processar`);

    for (const message of pendingMessages) {
      console.log(`Processando mensagem ${message.id}...`);

      // Marcar como processando
      await supabase
        .from("scheduled_messages")
        .update({ status: "processing" })
        .eq("id", message.id);

      // Buscar destinatários pendentes ou que falharam mas ainda podem ter retry
      const { data: recipients, error: recipientsError } = await supabase
        .from("scheduled_message_recipients")
        .select("*, customers(*)")
        .eq("scheduled_message_id", message.id)
        .or(`status.eq.pending,and(status.eq.failed,retry_count.lt.3)`);

      if (recipientsError) {
        console.error("Erro ao buscar destinatários:", recipientsError);
        continue;
      }

      let sentCount = message.sent_count || 0;
      let failedCount = message.failed_count || 0;

      // Processar cada destinatário
      for (const recipient of recipients || []) {
        try {
          const retryCount = recipient.retry_count || 0;
          
          // Se é um retry, verificar se já passou tempo suficiente (backoff exponencial)
          if (recipient.status === "failed" && recipient.last_retry_at) {
            const lastRetry = new Date(recipient.last_retry_at);
            const now = new Date();
            const waitTime = Math.pow(2, retryCount) * 60 * 1000; // 1min, 2min, 4min
            
            if (now.getTime() - lastRetry.getTime() < waitTime) {
              console.log(`Aguardando para retry do cliente ${recipient.customer_id} (tentativa ${retryCount + 1})`);
              continue;
            }
          }

          console.log(`Enviando para cliente ${recipient.customer_id} (tentativa ${retryCount + 1})...`);

          // Chamar função de envio de WhatsApp
          const { error: sendError } = await supabase.functions.invoke("send-whatsapp", {
            body: {
              customerId: recipient.customer_id,
              restaurantId: message.restaurant_id,
              message: message.message,
              mediaUrl: message.media_url,
              templateName: message.template_name,
            },
          });

          if (sendError) {
            console.error(`Erro ao enviar para ${recipient.customer_id}:`, sendError);
            const newRetryCount = retryCount + 1;
            const isFinalFailure = newRetryCount >= 3;
            
            failedCount++;
            await supabase
              .from("scheduled_message_recipients")
              .update({
                status: isFinalFailure ? "failed" : "pending",
                error_message: sendError.message,
                retry_count: newRetryCount,
                last_retry_at: new Date().toISOString(),
              })
              .eq("id", recipient.id);
              
            if (isFinalFailure) {
              console.log(`Falha definitiva após 3 tentativas para ${recipient.customer_id}`);
            } else {
              console.log(`Reagendando retry ${newRetryCount} para ${recipient.customer_id}`);
            }
          } else {
            console.log(`Enviado com sucesso para ${recipient.customer_id}`);
            sentCount++;
            await supabase
              .from("scheduled_message_recipients")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", recipient.id);
          }

          // Aplicar delay se configurado
          if (message.delay_seconds > 0) {
            console.log(`Aguardando ${message.delay_seconds} segundos...`);
            await new Promise((resolve) => setTimeout(resolve, message.delay_seconds * 1000));
          }
        } catch (error: any) {
          console.error(`Erro ao processar destinatário ${recipient.id}:`, error);
          const retryCount = (recipient.retry_count || 0) + 1;
          const isFinalFailure = retryCount >= 3;
          
          failedCount++;
          await supabase
            .from("scheduled_message_recipients")
            .update({
              status: isFinalFailure ? "failed" : "pending",
              error_message: error.message,
              retry_count: retryCount,
              last_retry_at: new Date().toISOString(),
            })
            .eq("id", recipient.id);
        }
      }

      // Verificar se ainda há destinatários pendentes ou aguardando retry
      const { data: pendingRecipients } = await supabase
        .from("scheduled_message_recipients")
        .select("id")
        .eq("scheduled_message_id", message.id)
        .or(`status.eq.pending,and(status.eq.failed,retry_count.lt.3)`);

      const allProcessed = !pendingRecipients || pendingRecipients.length === 0;
      
      await supabase
        .from("scheduled_messages")
        .update({
          status: allProcessed ? "completed" : "processing",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: allProcessed ? new Date().toISOString() : null,
        })
        .eq("id", message.id);

      console.log(`Mensagem ${message.id} processada: ${sentCount} enviadas, ${failedCount} falhas`);
    }

    return new Response(
      JSON.stringify({
        message: "Mensagens processadas com sucesso",
        processed: pendingMessages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao processar mensagens agendadas:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

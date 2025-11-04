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

    // Buscar mensagens pendentes que já estão no horário de envio
    const now = new Date().toISOString();
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
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

      // Buscar destinatários pendentes
      const { data: recipients, error: recipientsError } = await supabase
        .from("scheduled_message_recipients")
        .select("*, customers(*)")
        .eq("scheduled_message_id", message.id)
        .eq("status", "pending");

      if (recipientsError) {
        console.error("Erro ao buscar destinatários:", recipientsError);
        continue;
      }

      let sentCount = message.sent_count || 0;
      let failedCount = message.failed_count || 0;

      // Processar cada destinatário
      for (const recipient of recipients || []) {
        try {
          console.log(`Enviando para cliente ${recipient.customer_id}...`);

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
            failedCount++;
            await supabase
              .from("scheduled_message_recipients")
              .update({
                status: "failed",
                error_message: sendError.message,
              })
              .eq("id", recipient.id);
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
          failedCount++;
          await supabase
            .from("scheduled_message_recipients")
            .update({
              status: "failed",
              error_message: error.message,
            })
            .eq("id", recipient.id);
        }
      }

      // Atualizar status da mensagem agendada
      const allProcessed = sentCount + failedCount === message.total_recipients;
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

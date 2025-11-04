import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ScheduledMessagesListProps {
  restaurantId: string;
}

export function ScheduledMessagesList({ restaurantId }: ScheduledMessagesListProps) {
  const queryClient = useQueryClient();

  const { data: scheduledMessages, isLoading } = useQuery({
    queryKey: ["scheduled-messages", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_messages")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("scheduled_for", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const cancelMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", messageId)
        .in("status", ["pending"]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages", restaurantId] });
      toast.success("Mensagem cancelada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao cancelar mensagem:", error);
      toast.error("Erro ao cancelar mensagem");
    },
  });

  const handleCancel = (messageId: string) => {
    if (confirm("Tem certeza que deseja cancelar esta mensagem agendada?")) {
      cancelMessageMutation.mutate(messageId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case "processing":
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Enviando</Badge>;
      case "completed":
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />Concluído</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scheduledMessages || scheduledMessages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mensagens Agendadas</CardTitle>
          <CardDescription>Nenhuma mensagem agendada ainda</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens Agendadas</CardTitle>
        <CardDescription>Últimas mensagens programadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scheduledMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(msg.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.scheduled_for), "PPp", { locale: ptBR })}
                  </span>
                  {msg.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(msg.id)}
                      disabled={cancelMessageMutation.isPending}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <p className="text-sm line-clamp-2">{msg.message}</p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {msg.total_recipients} destinatários
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {msg.sent_count} enviadas
                  </div>
                  {msg.failed_count > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-3 w-3" />
                      {msg.failed_count} falhas
                    </div>
                  )}
                  {msg.status === "processing" && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Clock className="h-3 w-3 animate-pulse" />
                      Processando retries...
                    </div>
                  )}
                  {msg.delay_seconds > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Delay: {msg.delay_seconds}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

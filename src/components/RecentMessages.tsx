import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  customer_name: string;
  template_name: string;
  sent_at: string;
  status: "queued" | "sent" | "failed" | "delivered";
}

interface RecentMessagesProps {
  messages: Message[];
}

export const RecentMessages = ({ messages }: RecentMessagesProps) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      queued: {
        icon: <Clock className="w-3 h-3 mr-1" />,
        label: "Na Fila",
        className: "bg-warning text-warning-foreground",
      },
      sent: {
        icon: <MessageSquare className="w-3 h-3 mr-1" />,
        label: "Enviado",
        className: "bg-info text-info-foreground",
      },
      delivered: {
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        label: "Entregue",
        className: "bg-success text-success-foreground",
      },
      failed: {
        icon: <XCircle className="w-3 h-3 mr-1" />,
        label: "Falhou",
        className: "bg-destructive text-destructive-foreground",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    return (
      <Badge className={config.className}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma mensagem enviada ainda
              </p>
            ) : (
              messages.map((message) => (
              <div
                key={message.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{message.customer_name}</h3>
                    {getStatusBadge(message.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Template: {message.template_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(message.sent_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

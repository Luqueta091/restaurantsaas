import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, MessageSquare } from "lucide-react";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerPhone: string;
  restaurantId: string;
  onSuccess?: () => void;
}

export const SendMessageDialog = ({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerPhone,
  restaurantId,
  onSuccess,
}: SendMessageDialogProps) => {
  const [message, setMessage] = useState("");
  const [templateType, setTemplateType] = useState("custom");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateAIMessage = async () => {
    if (!templateType || templateType === "custom") {
      toast.error("Selecione um tipo de campanha");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            campaignType: templateType,
            customerName: customerName,
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessage(data.message);
      toast.success("Mensagem gerada com IA!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar mensagem");
    } finally {
      setGenerating(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          customerId,
          restaurantId,
          templateName: templateType,
          message: message.trim(),
        },
      });

      if (error) throw error;

      if (data.n8nConfigured) {
        toast.success("Mensagem enviada com sucesso!");
      } else {
        toast.info("Mensagem salva! Configure o webhook n8n para envio automático.");
      }

      setMessage("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const templates = [
    { value: "custom", label: "Mensagem Personalizada" },
    { value: "birthday", label: "Aniversário" },
    { value: "welcome", label: "Boas-vindas" },
    { value: "winback", label: "Reengajamento" },
    { value: "promotion", label: "Promoção Especial" },
    { value: "loyalty", label: "Programa de Fidelidade" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Enviar Mensagem WhatsApp
          </DialogTitle>
          <DialogDescription>
            Enviando para: <strong>{customerName}</strong> ({customerPhone})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Mensagem</Label>
            <Select value={templateType} onValueChange={setTemplateType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {templateType !== "custom" && (
            <Button
              onClick={generateAIMessage}
              disabled={generating}
              variant="outline"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Mensagem com IA
                </>
              )}
            </Button>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              rows={6}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000 caracteres
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              onClick={sendMessage}
              disabled={sending || !message.trim()}
              className="flex-1 bg-gradient-success hover:opacity-90"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Mensagem"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

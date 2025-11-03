import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, MessageSquare, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";

export const AIFeatures = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [messageData, setMessageData] = useState({
    campaignType: "birthday",
    customerName: "",
    customData: "",
  });

  const [imageData, setImageData] = useState({
    prompt: "",
    type: "banner",
  });

  const generateMessage = async () => {
    if (!messageData.customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(messageData),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult({ type: "message", content: data.message });
      toast.success("Mensagem gerada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar mensagem");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!imageData.prompt.trim()) {
      toast.error("Descreva o que você quer na imagem");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(imageData),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult({ type: "image", content: data.imageUrl });
      toast.success("Imagem gerada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  const analyzeBehavior = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyze-behavior`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            customerData: {
              total_orders: 15,
              last_order: "2025-01-15",
              messages_sent: 8,
              open_rate: 75,
              orders_after_promo: 6,
            },
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult({ type: "analysis", content: data.analysis });
      toast.success("Análise concluída!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao analisar comportamento");
    } finally {
      setLoading(false);
    }
  };

  const suggestCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-suggest-campaigns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            restaurantData: { context: "Restaurante de comida caseira, delivery" },
            customerStats: {
              total_customers: 150,
              active_customers: 90,
              conversion_rate: 8.5,
              average_ticket: 45,
            },
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult({ type: "campaigns", content: data.suggestions });
      toast.success("Sugestões geradas!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao sugerir campanhas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Recursos de IA
        </CardTitle>
        <CardDescription>
          Utilize inteligência artificial para otimizar seu restaurante
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messages">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="images">
              <ImageIcon className="w-4 h-4 mr-2" />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <Brain className="w-4 h-4 mr-2" />
              Análise
            </TabsTrigger>
            <TabsTrigger value="campaigns">
              <Sparkles className="w-4 h-4 mr-2" />
              Campanhas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Campanha</Label>
                <Select
                  value={messageData.campaignType}
                  onValueChange={(value) =>
                    setMessageData({ ...messageData, campaignType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Aniversário</SelectItem>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                    <SelectItem value="winback">Reengajamento</SelectItem>
                    <SelectItem value="promotion">Promoção</SelectItem>
                    <SelectItem value="loyalty">Fidelidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input
                  value={messageData.customerName}
                  onChange={(e) =>
                    setMessageData({ ...messageData, customerName: e.target.value })
                  }
                  placeholder="João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>Informações Adicionais (opcional)</Label>
                <Textarea
                  value={messageData.customData}
                  onChange={(e) =>
                    setMessageData({ ...messageData, customData: e.target.value })
                  }
                  placeholder="Ex: Promoção de pizza, desconto de 20%"
                />
              </div>
              <Button
                onClick={generateMessage}
                disabled={loading}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar Mensagem"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Imagem</Label>
                <Select
                  value={imageData.type}
                  onValueChange={(value) =>
                    setImageData({ ...imageData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner Promocional</SelectItem>
                    <SelectItem value="social">Rede Social</SelectItem>
                    <SelectItem value="promo">Arte de Promoção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descreva a Imagem</Label>
                <Textarea
                  value={imageData.prompt}
                  onChange={(e) =>
                    setImageData({ ...imageData, prompt: e.target.value })
                  }
                  placeholder="Ex: Pizza saborosa com ingredientes frescos, promoção 2 por 1"
                  rows={4}
                />
              </div>
              <Button
                onClick={generateImage}
                disabled={loading}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar Imagem"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Analise o comportamento de clientes e receba insights acionáveis sobre engajamento,
                classificação e recomendações personalizadas.
              </p>
              <Button
                onClick={analyzeBehavior}
                disabled={loading}
                className="w-full bg-gradient-success hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  "Analisar Comportamento"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Receba sugestões inteligentes de campanhas baseadas nos dados do seu restaurante
                e comportamento dos clientes.
              </p>
              <Button
                onClick={suggestCampaigns}
                disabled={loading}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando sugestões...
                  </>
                ) : (
                  "Sugerir Campanhas"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {result && (
          <Card className="mt-6 bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              {result.type === "image" ? (
                <img
                  src={result.content}
                  alt="Imagem gerada"
                  className="w-full rounded-lg shadow-md"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{result.content}</pre>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

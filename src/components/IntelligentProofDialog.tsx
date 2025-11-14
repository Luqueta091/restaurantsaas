import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";

interface IntelligentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onSuccess: (metrics: any, dailyData: any[]) => void;
}

export const IntelligentProofDialog = ({ 
  open, 
  onOpenChange, 
  restaurantId,
  onSuccess 
}: IntelligentProofDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [targetRevenue, setTargetRevenue] = useState("");
  const [days, setDays] = useState("30");

  const handleGenerate = async () => {
    if (!targetRevenue || parseFloat(targetRevenue) <= 0) {
      toast.error("Informe um faturamento válido");
      return;
    }

    if (!days || parseInt(days) <= 0 || parseInt(days) > 365) {
      toast.error("Informe um período válido (1-365 dias)");
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("generate-proof-data", {
        body: {
          targetRevenue: parseFloat(targetRevenue),
          days: parseInt(days),
          restaurantId,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("✨ Prova social gerada com sucesso!");
      onSuccess(data.metrics, data.dailyData);
      onOpenChange(false);
      setTargetRevenue("");
      setDays("30");
    } catch (error: any) {
      console.error("Erro ao gerar prova social:", error);
      
      if (error.message?.includes("429")) {
        toast.error("Muitas requisições. Tente novamente em alguns instantes.");
      } else if (error.message?.includes("402")) {
        toast.error("Créditos insuficientes. Adicione créditos em Settings → Workspace.");
      } else {
        toast.error("Erro ao gerar prova social: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Prova Social Inteligente
          </DialogTitle>
          <DialogDescription>
            Use IA para gerar estatísticas realistas que mostram o crescimento do seu negócio. 
            Perfeito para demonstrações e provas de conceito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="w-4 h-4 text-success" />
              Como funciona
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>A IA calcula clientes e mensagens proporcionais ao faturamento</li>
              <li>Gera um gráfico com crescimento gradual e realista</li>
              <li>Ajusta automaticamente todos os números do dashboard</li>
              <li>Valores condizentes com negócios de food delivery</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetRevenue">Faturamento Desejado (R$)</Label>
            <Input
              id="targetRevenue"
              type="number"
              step="0.01"
              placeholder="10000.00"
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Quanto você quer mostrar que faturou no período
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">Período (dias)</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="365"
              placeholder="30"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Quantos dias de histórico mostrar no gráfico (1-365)
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Prova Social
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            💡 A IA gera valores realistas baseados em dados de mercado
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
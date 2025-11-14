import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Settings, Sparkles } from "lucide-react";
import { IntelligentProofDialog } from "./IntelligentProofDialog";

interface DashboardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onConfigUpdate: () => void;
}

export const DashboardConfigDialog = ({ open, onOpenChange, restaurantId, onConfigUpdate }: DashboardConfigDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showIntelligentDialog, setShowIntelligentDialog] = useState(false);
  const [config, setConfig] = useState({
    totalRevenue: "",
    monthlyRevenue: "",
    revenueGrowth: "",
  });

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open, restaurantId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dashboard_config")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          totalRevenue: data.total_revenue?.toString() || "0",
          monthlyRevenue: data.monthly_revenue?.toString() || "0",
          revenueGrowth: data.revenue_growth_percentage?.toString() || "0",
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from("dashboard_config")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      const configData = {
        restaurant_id: restaurantId,
        total_revenue: parseFloat(config.totalRevenue) || 0,
        monthly_revenue: parseFloat(config.monthlyRevenue) || 0,
        revenue_growth_percentage: parseFloat(config.revenueGrowth) || 0,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("dashboard_config")
          .update(configData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dashboard_config")
          .insert(configData);

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      onConfigUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurar Dashboard
            </DialogTitle>
            <DialogDescription>
              Configure manualmente ou use IA para gerar valores realistas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="intelligent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="intelligent">
                <Sparkles className="w-4 h-4 mr-2" />
                IA Inteligente
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Settings className="w-4 h-4 mr-2" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="intelligent" className="space-y-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Modo Inteligente
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use IA para gerar estatísticas realistas de crescimento. Perfeito para demonstrações e provas de conceito.
                  </p>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Calcula clientes e mensagens proporcionais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Gera gráfico com crescimento gradual realista</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Valores condizentes com food delivery</span>
                  </li>
                </ul>

                <Button
                  onClick={() => {
                    setShowIntelligentDialog(true);
                    onOpenChange(false);
                  }}
                  className="w-full bg-gradient-primary"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Configurar com IA
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalRevenue">Faturamento Total (R$)</Label>
                    <Input
                      id="totalRevenue"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={config.totalRevenue}
                      onChange={(e) => setConfig({ ...config, totalRevenue: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyRevenue">Faturamento Mensal (R$)</Label>
                    <Input
                      id="monthlyRevenue"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={config.monthlyRevenue}
                      onChange={(e) => setConfig({ ...config, monthlyRevenue: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revenueGrowth">Crescimento (%)</Label>
                    <Input
                      id="revenueGrowth"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={config.revenueGrowth}
                      onChange={(e) => setConfig({ ...config, revenueGrowth: e.target.value })}
                    />
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Configurações"
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <IntelligentProofDialog
        open={showIntelligentDialog}
        onOpenChange={setShowIntelligentDialog}
        restaurantId={restaurantId}
        onSuccess={(metrics, dailyData) => {
          // Atualizar configuração para refletir os novos dados
          loadConfig();
          onConfigUpdate();
          toast.success(
            `✨ Dashboard atualizado: ${metrics.totalCustomers} clientes, ${metrics.messagesSent} mensagens, ${metrics.conversionRate} conversão`
          );
        }}
      />
    </>
  );
};
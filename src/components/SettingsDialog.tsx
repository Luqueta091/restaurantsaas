import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  currentInstanceName?: string;
  onSuccess?: () => void;
}

export const SettingsDialog = ({ open, onOpenChange, restaurantId, currentInstanceName, onSuccess }: SettingsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [instanceName, setInstanceName] = useState("");

  useEffect(() => {
    if (currentInstanceName) {
      setInstanceName(currentInstanceName);
    }
  }, [currentInstanceName]);

  const handleSave = async () => {
    if (!instanceName.trim()) {
      toast.error("Por favor, preencha o nome da instância");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ evolution_instance_name: instanceName.trim() })
        .eq('id', restaurantId);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar configurações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configurações do WhatsApp</DialogTitle>
          <DialogDescription>
            Configure o nome da instância da Evolution API para o seu restaurante
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure o nome da instância da Evolution API para o seu restaurante. Cada restaurante pode usar um número de WhatsApp diferente.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="evolutionInstanceName">
              Nome da Instância da Evolution API *
            </Label>
            <Input
              id="evolutionInstanceName"
              placeholder="Ex: main, restaurante-silva, etc"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Este é o nome da sua instância do WhatsApp na Evolution API. Cada instância corresponde a um número de WhatsApp diferente.
            </p>
          </div>
        </div>

        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm">
            <strong>ℹ️ Como funciona:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
              <li>A URL e Token da Evolution API são compartilhados (configurados no sistema)</li>
              <li>Cada restaurante tem seu próprio Instance Name</li>
              <li>Cada Instance Name corresponde a um número de WhatsApp diferente</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

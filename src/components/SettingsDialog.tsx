import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    evolutionApiUrl: "",
    evolutionApiToken: "",
    evolutionInstanceName: "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Aqui você pode adicionar lógica para salvar as configurações
      // Por enquanto, apenas mostra uma mensagem
      toast.success("As configurações da Evolution API estão prontas!");
      
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
          <DialogTitle>Configurações da Evolution API</DialogTitle>
          <DialogDescription>
            Configure as credenciais da Evolution API para enviar mensagens via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As variáveis de ambiente da Evolution API já foram configuradas no backend (Lovable Cloud). Certifique-se de que os valores estão corretos:
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="evolutionApiUrl" className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              EVOLUTION_API_URL
            </Label>
            <Input
              id="evolutionApiUrl"
              placeholder="https://sua-evolution-api.railway.app"
              value={settings.evolutionApiUrl}
              onChange={(e) =>
                setSettings({ ...settings, evolutionApiUrl: e.target.value })
              }
              className="font-mono text-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              URL da sua Evolution API hospedada no Railway
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evolutionApiToken" className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              EVOLUTION_API_TOKEN
            </Label>
            <Input
              id="evolutionApiToken"
              type="password"
              placeholder="••••••••••••••••"
              value={settings.evolutionApiToken}
              onChange={(e) =>
                setSettings({ ...settings, evolutionApiToken: e.target.value })
              }
              className="font-mono text-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Token de autenticação da Evolution API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evolutionInstanceName" className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              EVOLUTION_INSTANCE_NAME
            </Label>
            <Input
              id="evolutionInstanceName"
              placeholder="minha-instancia"
              value={settings.evolutionInstanceName}
              onChange={(e) =>
                setSettings({ ...settings, evolutionInstanceName: e.target.value })
              }
              className="font-mono text-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Nome da instância do WhatsApp na Evolution API
            </p>
          </div>
        </div>

        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm">
            <strong>✅ Configuração Atual:</strong> As variáveis já estão configuradas no Lovable Cloud (Secrets). 
            Para alterá-las, você precisa acessar as configurações do projeto no Lovable.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, LogOut, Settings } from "lucide-react";
import { SettingsDialog } from "./SettingsDialog";

interface HeaderProps {
  restaurantName?: string;
  restaurantId?: string;
  evolutionInstanceName?: string;
  onSettingsSaved?: () => void;
}

export const Header = ({ restaurantName, restaurantId, evolutionInstanceName, onSettingsSaved }: HeaderProps) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <ChefHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">RestaurantOS</h1>
            {restaurantName && (
              <p className="text-sm text-muted-foreground">{restaurantName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
      
      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        restaurantId={restaurantId || ""}
        currentInstanceName={evolutionInstanceName}
        onSuccess={onSettingsSaved}
      />
    </header>
  );
};

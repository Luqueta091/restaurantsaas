import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Header } from "@/components/Header";
import { DashboardStats } from "@/components/DashboardStats";
import { CustomerList } from "@/components/CustomerList";
import { RecentMessages } from "@/components/RecentMessages";
import { AIChatbot } from "@/components/AIChatbot";
import { AIFeatures } from "@/components/AIFeatures";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "+55",
    birthday: "",
  });
  const [creating, setCreating] = useState(false);
  const [sendMessageDialog, setSendMessageDialog] = useState<{
    open: boolean;
    customerId: string;
    customerName: string;
    customerPhone: string;
  }>({
    open: false,
    customerId: "",
    customerName: "",
    customerPhone: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      loadRestaurantData();
    }
  }, [session]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);

      // Buscar ou criar restaurante
      let { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", session?.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!restaurantData) {
        // Restaurante não existe, criar
        const { data: newRestaurant, error: createError } = await supabase
          .from("restaurants")
          .insert({
            owner_id: session?.user.id,
            name: session?.user.user_metadata?.restaurant_name || "Meu Restaurante",
          })
          .select()
          .single();

        if (createError) throw createError;
        restaurantData = newRestaurant;
      }

      setRestaurant(restaurantData);

      // Buscar clientes
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantData?.id)
        .order("created_at", { ascending: false });

      setCustomers(customersData || []);

      // Buscar mensagens recentes
      const { data: messagesData } = await supabase
        .from("messages")
        .select(`
          id,
          template_name,
          sent_at,
          status,
          customers!inner (
            name
          )
        `)
        .eq("restaurant_id", restaurantData?.id)
        .order("sent_at", { ascending: false })
        .limit(10);

      const formattedMessages = messagesData?.map((msg: any) => ({
        id: msg.id,
        template_name: msg.template_name,
        sent_at: msg.sent_at,
        status: msg.status,
        customer_name: msg.customers.name,
      }));

      setMessages(formattedMessages || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Validar telefone brasileiro
      const phoneDigits = newCustomer.phone.replace(/\D/g, '');
      if (!phoneDigits.startsWith('55') || phoneDigits.length !== 13) {
        toast.error("Número deve ser do Brasil (+55) com 11 dígitos");
        setCreating(false);
        return;
      }

      const { error } = await supabase.from("customers").insert({
        restaurant_id: restaurant?.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        birthday: newCustomer.birthday || null,
      });

      if (error) throw error;

      toast.success("Cliente adicionado com sucesso!");
      setShowNewCustomerDialog(false);
      setNewCustomer({ name: "", phone: "+55", birthday: "" });
      loadRestaurantData();
    } catch (error: any) {
      toast.error("Erro ao adicionar cliente: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = (customerId: string, customerName: string, customerPhone: string) => {
    setSendMessageDialog({
      open: true,
      customerId,
      customerName,
      customerPhone,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <Header restaurantName={restaurant?.name} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">
              Bem-vindo ao seu painel de gestão
            </p>
          </div>
          <Button
            onClick={() => setShowNewCustomerDialog(true)}
            className="bg-gradient-primary hover:opacity-90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <DashboardStats
          totalCustomers={customers.length}
          messagesSent={messages.length}
          activeCampaigns={0}
          conversionRate="8.5%"
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <CustomerList
            customers={customers}
            onSendMessage={handleSendMessage}
          />
          <RecentMessages messages={messages} />
        </div>

        <AIFeatures />
      </main>

      <AIChatbot />

      <SendMessageDialog
        open={sendMessageDialog.open}
        onOpenChange={(open) => setSendMessageDialog({ ...sendMessageDialog, open })}
        customerId={sendMessageDialog.customerId}
        customerName={sendMessageDialog.customerName}
        customerPhone={sendMessageDialog.customerPhone}
        restaurantId={restaurant?.id || ""}
        onSuccess={loadRestaurantData}
      />

      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente para adicionar à sua base
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone * (Brasil)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+55 11 98765-4321"
                value={newCustomer.phone}
                onChange={(e) => {
                  let value = e.target.value;
                  // Sempre manter +55 no início
                  if (!value.startsWith('+55')) {
                    value = '+55' + value.replace(/\D/g, '');
                  }
                  setNewCustomer({ ...newCustomer, phone: value });
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: +55 11 98765-4321 (11 dígitos após +55)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">Data de Nascimento</Label>
              <Input
                id="birthday"
                type="date"
                value={newCustomer.birthday}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, birthday: e.target.value })
                }
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                "Adicionar Cliente"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

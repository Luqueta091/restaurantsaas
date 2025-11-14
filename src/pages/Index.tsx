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
import { OrderDialog } from "@/components/OrderDialog";
import { OrderHistory } from "@/components/OrderHistory";
import { ScheduledMessagesDialog } from "@/components/ScheduledMessagesDialog";
import { ScheduledMessagesList } from "@/components/ScheduledMessagesList";
import { RevenueChart } from "@/components/RevenueChart";
import { DashboardConfigDialog } from "@/components/DashboardConfigDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Loader2, Settings } from "lucide-react";

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
  const [orderDialog, setOrderDialog] = useState<{
    open: boolean;
    customerId: string;
    customerName: string;
  }>({
    open: false,
    customerId: "",
    customerName: "",
  });
  const [orderHistoryDialog, setOrderHistoryDialog] = useState<{
    open: boolean;
    customerId: string;
    customerName: string;
  }>({
    open: false,
    customerId: "",
    customerName: "",
  });
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [revenueData, setRevenueData] = useState({
    chartData: [] as { date: string; revenue: number }[],
    totalRevenue: 0,
    monthlyRevenue: 0,
    growthPercentage: 0,
  });
  const [proofMetrics, setProofMetrics] = useState({
    totalCustomers: 0,
    messagesSent: 0,
    conversionRate: "8.5%",
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

  useEffect(() => {
    if (restaurant?.id) {
      loadRevenueData();
    }
  }, [restaurant?.id]);

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

  const loadRevenueData = async () => {
    if (!restaurant?.id) return;

    try {
      // Carregar configuração personalizada
      const { data: config } = await supabase
        .from("dashboard_config")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      // Buscar pedidos dos últimos 30 dias para o gráfico
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total_amount")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: true });

      // Agrupar pedidos por dia
      const dailyRevenue: { [key: string]: number } = {};
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split("T")[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(order.total_amount?.toString() || "0");
      });

      const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue,
      }));

      // Calcular faturamento real
      const totalRealRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount?.toString() || "0"), 0) || 0;

      // Buscar dados de prova social se existirem
      const { data: proofConfig } = await supabase
        .from("dashboard_config")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (proofConfig) {
        // Gerar dados do gráfico baseado na config
        const generateProofChartData = () => {
          const data = [];
          const days = 30;
          const startRevenue = proofConfig.total_revenue * 0.3;
          const growthPerDay = (proofConfig.total_revenue - startRevenue) / days;
          const today = new Date();

          for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (days - i - 1));
            const baseRevenue = startRevenue + (growthPerDay * i);
            const variation = baseRevenue * (Math.random() * 0.2 - 0.1);
            const dailyRevenue = Math.max(0, baseRevenue + variation);

            data.push({
              date: date.toISOString().split("T")[0],
              revenue: Math.round(dailyRevenue * 100) / 100,
            });
          }
          return data;
        };

        const proofChartData = generateProofChartData();

        setRevenueData({
          chartData: proofChartData.length > 0 ? proofChartData : chartData,
          totalRevenue: proofConfig.total_revenue || totalRealRevenue,
          monthlyRevenue: proofConfig.monthly_revenue || totalRealRevenue,
          growthPercentage: proofConfig.revenue_growth_percentage || 0,
        });
      } else {
        // Usar valores da config se existirem, senão usar valores reais
        setRevenueData({
          chartData: chartData.length > 0 ? chartData : [{ date: new Date().toISOString().split("T")[0], revenue: 0 }],
          totalRevenue: config?.total_revenue || totalRealRevenue,
          monthlyRevenue: config?.monthly_revenue || totalRealRevenue,
          growthPercentage: config?.revenue_growth_percentage || 0,
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados de faturamento:", error);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Validar telefone brasileiro
      const phoneDigits = newCustomer.phone.replace(/\D/g, '');
      if (!phoneDigits.startsWith('55')) {
        toast.error("Número deve ser do Brasil (+55)");
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

  const handleRegisterOrder = (customerId: string, customerName: string) => {
    setOrderDialog({
      open: true,
      customerId,
      customerName,
    });
  };

  const handleViewOrders = (customerId: string, customerName: string) => {
    setOrderHistoryDialog({
      open: true,
      customerId,
      customerName,
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
      <Header 
        restaurantName={restaurant?.name} 
        restaurantId={restaurant?.id}
        evolutionInstanceName={restaurant?.evolution_instance_name}
        onSettingsSaved={loadRestaurantData}
      />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">
              Bem-vindo ao seu painel de gestão
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowConfigDialog(true)}
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
            <ScheduledMessagesDialog restaurantId={restaurant?.id || ""} />
            <Button
              onClick={() => setShowNewCustomerDialog(true)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        <DashboardStats
          totalCustomers={proofMetrics.totalCustomers || customers.length}
          messagesSent={proofMetrics.messagesSent || messages.length}
          activeCampaigns={0}
          conversionRate={proofMetrics.conversionRate}
          totalRevenue={revenueData.totalRevenue}
          revenueGrowth={`${revenueData.growthPercentage >= 0 ? '+' : ''}${revenueData.growthPercentage.toFixed(1)}%`}
        />

        <RevenueChart
          data={revenueData.chartData}
          totalRevenue={revenueData.totalRevenue}
          monthlyRevenue={revenueData.monthlyRevenue}
          growthPercentage={revenueData.growthPercentage}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <CustomerList
            customers={customers}
            onSendMessage={handleSendMessage}
            onRegisterOrder={handleRegisterOrder}
            onViewOrders={handleViewOrders}
          />
          <RecentMessages messages={messages} />
        </div>

        <ScheduledMessagesList restaurantId={restaurant?.id || ""} />

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

      <OrderDialog
        open={orderDialog.open}
        onOpenChange={(open) => setOrderDialog({ ...orderDialog, open })}
        customerId={orderDialog.customerId}
        customerName={orderDialog.customerName}
        restaurantId={restaurant?.id || ""}
        onSuccess={loadRestaurantData}
      />

      <OrderHistory
        open={orderHistoryDialog.open}
        onOpenChange={(open) => setOrderHistoryDialog({ ...orderHistoryDialog, open })}
        customerId={orderHistoryDialog.customerId}
        customerName={orderHistoryDialog.customerName}
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
                Exemplo: +55 11 98765-4321
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

      <DashboardConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        restaurantId={restaurant?.id || ""}
        onConfigUpdate={() => {
          loadRevenueData();
          loadRestaurantData();
        }}
      />
    </div>
  );
};

export default Index;

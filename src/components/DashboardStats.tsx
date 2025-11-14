import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, Gift, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "success" | "warning" | "info";
}

const StatCard = ({ title, value, icon, trend, variant = "default" }: StatCardProps) => {
  const variantClasses = {
    default: "bg-gradient-primary text-primary-foreground",
    success: "bg-gradient-success text-success-foreground",
    warning: "bg-accent text-accent-foreground",
    info: "bg-info text-info-foreground",
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className={cn("p-4 rounded-2xl shadow-md", variantClasses[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardStatsProps {
  totalCustomers: number;
  messagesSent: number;
  activeCampaigns: number;
  conversionRate: string;
  totalRevenue?: number;
  revenueGrowth?: string;
}

export const DashboardStats = ({
  totalCustomers,
  messagesSent,
  activeCampaigns,
  conversionRate,
  totalRevenue = 0,
  revenueGrowth = "+0%",
}: DashboardStatsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total de Clientes"
        value={totalCustomers}
        icon={<Users className="w-6 h-6" />}
        trend="+12% este mês"
        variant="default"
      />
      <StatCard
        title="Mensagens Enviadas"
        value={messagesSent}
        icon={<MessageSquare className="w-6 h-6" />}
        trend="+25% esta semana"
        variant="info"
      />
      <StatCard
        title="Campanhas Ativas"
        value={activeCampaigns}
        icon={<Gift className="w-6 h-6" />}
        variant="warning"
      />
      <StatCard
        title="Taxa de Conversão"
        value={conversionRate}
        icon={<TrendingUp className="w-6 h-6" />}
        trend="+5% este mês"
        variant="success"
      />
      <StatCard
        title="Faturamento"
        value={formatCurrency(totalRevenue)}
        icon={<DollarSign className="w-6 h-6" />}
        trend={revenueGrowth}
        variant="default"
      />
    </div>
  );
};

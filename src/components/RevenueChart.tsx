import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  data: {
    date: string;
    revenue: number;
  }[];
  totalRevenue: number;
  monthlyRevenue: number;
  growthPercentage: number;
}

export const RevenueChart = ({ data, totalRevenue, monthlyRevenue, growthPercentage }: RevenueChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Faturamento</CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Este Mês</p>
              <p className="text-xl font-bold">{formatCurrency(monthlyRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Crescimento</p>
              <p className={`text-xl font-bold flex items-center gap-1 ${growthPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                <TrendingUp className="w-4 h-4" />
                {growthPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              }}
            />
            <YAxis 
              className="text-xs"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
              name="Faturamento"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
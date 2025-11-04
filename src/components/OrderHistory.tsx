import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string | null;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface OrderHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export const OrderHistory = ({ open, onOpenChange, customerId, customerName }: OrderHistoryProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      loadOrders();
    }
  }, [open, customerId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      completed: { label: "Concluído", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    };

    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Histórico de Pedidos - {customerName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido encontrado
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      {order.order_number && (
                        <p className="text-sm font-mono text-muted-foreground">
                          #{order.order_number}
                        </p>
                      )}
                      <p className="font-semibold text-lg">
                        {formatCurrency(order.total_amount)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>

                  {order.notes && (
                    <p className="text-sm text-muted-foreground border-t pt-2">
                      {order.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {!loading && orders.length > 0 && (
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total de pedidos: {orders.length}
            </span>
            <span className="font-semibold">
              Total: {formatCurrency(orders.reduce((sum, order) => sum + order.total_amount, 0))}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

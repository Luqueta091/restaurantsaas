import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  restaurantId: string;
  onSuccess?: () => void;
}

export const OrderDialog = ({ 
  open, 
  onOpenChange, 
  customerId, 
  customerName, 
  restaurantId,
  onSuccess 
}: OrderDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState({
    orderNumber: "",
    totalAmount: "",
    status: "completed",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order.totalAmount || parseFloat(order.totalAmount) <= 0) {
      toast.error("Valor do pedido deve ser maior que zero");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          restaurant_id: restaurantId,
          order_number: order.orderNumber || null,
          total_amount: parseFloat(order.totalAmount),
          status: order.status,
          notes: order.notes || null,
        });

      if (error) throw error;

      toast.success("Pedido registrado com sucesso!");
      setOrder({
        orderNumber: "",
        totalAmount: "",
        status: "completed",
        notes: "",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao registrar pedido: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pedido</DialogTitle>
          <DialogDescription>
            Registrar novo pedido para {customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">Número do Pedido</Label>
            <Input
              id="orderNumber"
              placeholder="#12345"
              value={order.orderNumber}
              onChange={(e) => setOrder({ ...order, orderNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAmount">Valor Total (R$) *</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={order.totalAmount}
              onChange={(e) => setOrder({ ...order, totalAmount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={order.status} onValueChange={(value) => setOrder({ ...order, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Detalhes do pedido..."
              value={order.notes}
              onChange={(e) => setOrder({ ...order, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar Pedido"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

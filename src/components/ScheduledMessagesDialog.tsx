import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface ScheduledMessagesDialogProps {
  restaurantId: string;
}

export function ScheduledMessagesDialog({ restaurantId }: ScheduledMessagesDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [delaySeconds, setDelaySeconds] = useState("5");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ["customers", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data;
    },
  });

  const handleSchedule = async () => {
    if (!message || !scheduledDate || !scheduledTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
      
      // Filtrar destinatários
      let filteredCustomers = customers || [];
      if (recipientFilter === "recent") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredCustomers = filteredCustomers.filter(
          c => c.last_order && new Date(c.last_order) >= thirtyDaysAgo
        );
      } else if (recipientFilter === "inactive") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredCustomers = filteredCustomers.filter(
          c => !c.last_order || new Date(c.last_order) < thirtyDaysAgo
        );
      } else if (recipientFilter === "custom") {
        filteredCustomers = filteredCustomers.filter(c => selectedCustomers.includes(c.id));
      }

      if (filteredCustomers.length === 0) {
        toast.error("Nenhum cliente encontrado para envio");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Criar mensagem agendada
      const { data: scheduledMessage, error: scheduleError } = await supabase
        .from("scheduled_messages")
        .insert({
          restaurant_id: restaurantId,
          created_by: user?.id,
          message,
          scheduled_for: scheduledFor.toISOString(),
          delay_seconds: parseInt(delaySeconds),
          total_recipients: filteredCustomers.length,
          status: "pending",
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Criar registros de destinatários
      const recipients = filteredCustomers.map(customer => ({
        scheduled_message_id: scheduledMessage.id,
        customer_id: customer.id,
        status: "pending",
      }));

      const { error: recipientsError } = await supabase
        .from("scheduled_message_recipients")
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      toast.success(`Mensagem agendada para ${filteredCustomers.length} clientes`);
      setOpen(false);
      setMessage("");
      setScheduledDate("");
      setScheduledTime("");
      setSelectedCustomers([]);
      setRecipientFilter("all");
    } catch (error: any) {
      console.error("Erro ao agendar mensagem:", error);
      toast.error("Erro ao agendar mensagem");
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const toggleAllCustomers = () => {
    if (selectedCustomers.length === customers?.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers?.map((c) => c.id) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Agendar Mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Mensagens em Massa</DialogTitle>
          <DialogDescription>
            Configure o envio programado de mensagens para seus clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="recipients">Destinatários</Label>
            <Select
              value={recipientFilter}
              onValueChange={(value) => {
                setRecipientFilter(value);
                if (value !== "custom") setSelectedCustomers([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Todos os clientes ({customers?.length || 0})
                  </div>
                </SelectItem>
                <SelectItem value="recent">Clientes ativos (últimos 30 dias)</SelectItem>
                <SelectItem value="inactive">Clientes inativos (+30 dias)</SelectItem>
                <SelectItem value="custom">Selecionar clientes específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientFilter === "custom" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Clientes ({selectedCustomers.length} selecionados)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllCustomers}
                >
                  {selectedCustomers.length === customers?.length ? "Desmarcar" : "Selecionar"} todos
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-md p-4">
                <div className="space-y-2">
                  {customers?.map((customer) => (
                    <div key={customer.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={customer.id}
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleCustomer(customer.id)}
                      />
                      <Label htmlFor={customer.id} className="cursor-pointer text-sm flex-1">
                        {customer.name} - {customer.phone}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="delay">Delay entre mensagens (segundos)</Label>
            <Input
              id="delay"
              type="number"
              min="0"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tempo de espera entre cada envio para evitar bloqueios
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={loading}
              className="flex-1 gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? "Agendando..." : "Agendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

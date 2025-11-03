import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Calendar, Trophy, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  phone: string;
  birthday: string | null;
  last_order: string | null;
  total_orders: number;
  loyalty_level?: string;
}

interface CustomerListProps {
  customers: Customer[];
  onSendMessage: (customerId: string, customerName: string, customerPhone: string) => void;
}

export const CustomerList = ({ customers, onSendMessage }: CustomerListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

  const getLoyaltyBadge = (level: string = "bronze") => {
    const colors = {
      bronze: "bg-amber-600",
      silver: "bg-slate-400",
      gold: "bg-yellow-500",
      platinum: "bg-purple-500",
    };
    return (
      <Badge className={colors[level as keyof typeof colors]}>
        <Trophy className="w-3 h-3 mr-1" />
        {level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Clientes</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum cliente encontrado
            </p>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{customer.name}</h3>
                    {customer.loyalty_level && getLoyaltyBadge(customer.loyalty_level)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </span>
                    {customer.birthday && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(customer.birthday), "dd/MM", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                    <span className="font-medium">
                      {customer.total_orders} pedidos
                    </span>
                  </div>
                  {customer.last_order && (
                    <p className="text-xs text-muted-foreground">
                      Último pedido:{" "}
                      {format(new Date(customer.last_order), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => onSendMessage(customer.id, customer.name, customer.phone)}
                  className="bg-gradient-success hover:opacity-90"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enviar Mensagem
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

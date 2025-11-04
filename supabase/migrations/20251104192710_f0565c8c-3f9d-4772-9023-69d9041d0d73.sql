-- Adicionar foreign key entre scheduled_message_recipients e customers
ALTER TABLE public.scheduled_message_recipients
ADD CONSTRAINT fk_scheduled_message_recipients_customer
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE CASCADE;
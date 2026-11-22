import { z } from "zod";

export const reserveTicketSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  holderName: z.string().min(2).max(120),
  holderEmail: z.string().email(),
});

export const checkoutSchema = z.object({
  ticketId: z.string().min(1),
});

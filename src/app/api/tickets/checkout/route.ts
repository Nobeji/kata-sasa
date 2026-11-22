import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok } from "@/lib/api";
import { checkoutSchema } from "@/lib/validators/ticket";
import { getPaymentAdapter } from "@/lib/payments/stripe";
import { absoluteUrl } from "@/lib/utils";
import { TicketStatus } from "@prisma/client";
import { sendTicketConfirmation } from "@/lib/ticket-email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId } = checkoutSchema.parse(body);

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { ticketType: true, event: true },
    });
    if (!ticket) return err("Ticket not found", 404);
    if (ticket.status !== TicketStatus.RESERVED) return err("Ticket is not reservable for checkout", 400);

    // Free ticket: mark paid immediately
    if (ticket.ticketType.price <= 0) {
      const paid = await db.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.PAID, paidAt: new Date() },
        include: { ticketType: true, event: true },
      });
      await sendTicketConfirmation(paid.id).catch(console.error);
      return ok({ free: true, ticketId: paid.id });
    }

    const adapter = getPaymentAdapter();
    const session = await adapter.createCheckoutSession({
      ticketId: ticket.id,
      eventTitle: ticket.event.title,
      ticketTypeName: ticket.ticketType.name,
      amount: ticket.ticketType.price,
      currency: ticket.ticketType.currency,
      customerEmail: ticket.holderEmail,
      successUrl: absoluteUrl(`/tickets/success?ticketId=${ticket.id}`),
      cancelUrl: absoluteUrl(`/tickets/cancel?ticketId=${ticket.id}`),
    });

    await db.ticket.update({
      where: { id: ticket.id },
      data: { stripeSessionId: session.id },
    });

    return ok({ url: session.url, sessionId: session.id });
  } catch (error) {
    return handleApiError(error);
  }
}

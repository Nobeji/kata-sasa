import { NextRequest } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/api";
import { TicketStatus } from "@prisma/client";
import { sendTicketConfirmation } from "@/lib/ticket-email";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) return err("Stripe webhook not configured", 500);

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return err("Missing stripe-signature header", 400);

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (e: unknown) {
    const message = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "Unknown error";
    console.error("Stripe webhook signature verification failed", message);
    return err("Invalid signature", 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const ticketId = session.metadata?.ticketId;
    if (ticketId) {
      const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
      if (ticket && ticket.status === TicketStatus.RESERVED) {
        await db.ticket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.PAID,
            paidAt: new Date(),
            stripeSessionId: session.id,
          },
        });
        await sendTicketConfirmation(ticketId).catch(console.error);
      }
    }
  }

  return ok({ received: true });
}

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok } from "@/lib/api";
import { rsvpSchema } from "@/lib/validators/invitation";
import { generateQrToken } from "@/lib/qr";
import { TicketStatus, RsvpStatus, EventStatus } from "@prisma/client";

type Ctx = { params: { token: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json();
    const data = rsvpSchema.parse(body);

    const invitation = await db.invitation.findUnique({
      where: { token: params.token },
      include: { event: true, ticket: true },
    });
    if (!invitation) return err("Invitation not found", 404);
    if (invitation.event.status === EventStatus.CANCELLED) return err("Event is cancelled", 400);

    if (data.rsvpStatus === "DECLINED") {
      const updated = await db.invitation.update({
        where: { id: invitation.id },
        data: { rsvpStatus: RsvpStatus.DECLINED, respondedAt: new Date() },
      });
      return ok({ invitation: { rsvpStatus: updated.rsvpStatus, respondedAt: updated.respondedAt, ticketId: updated.ticketId } });
    }

    // ATTENDING
    if (invitation.rsvpStatus === RsvpStatus.ATTENDING && invitation.ticketId) {
      return ok({ invitation: { rsvpStatus: invitation.rsvpStatus, respondedAt: invitation.respondedAt, ticketId: invitation.ticketId } });
    }

    const result = await db.$transaction(async (tx) => {
      const inv = await tx.invitation.findUnique({ where: { id: invitation.id }, include: { event: true } });
      if (!inv) throw new Error("NOT_FOUND");
      if (inv.rsvpStatus === RsvpStatus.ATTENDING && inv.ticketId) return inv;

      // Ensure invitation ticket type exists
      let ticketType = await tx.ticketType.findFirst({
        where: { eventId: inv.eventId, isInvitationType: true },
      });
      if (!ticketType) {
        ticketType = await tx.ticketType.create({
          data: {
            eventId: inv.eventId,
            name: "Invitation",
            price: 0,
            currency: "TZS",
            quantity: Math.max(inv.event.capacity, 100),
            sold: 0,
            isInvitationType: true,
          },
        });
      }

      // Capacity check
      const activeTickets = await tx.ticket.count({
        where: { eventId: inv.eventId, status: { in: [TicketStatus.RESERVED, TicketStatus.PAID, TicketStatus.CHECKED_IN] } },
      });
      if (activeTickets >= inv.event.capacity) throw new Error("EVENT_FULL");

      // Atomically increment sold
      const inc = await tx.ticketType.updateMany({
        where: { id: ticketType.id, sold: { lt: ticketType.quantity } },
        data: { sold: { increment: 1 } },
      });
      if (inc.count !== 1) throw new Error("EVENT_FULL");

      const ticket = await tx.ticket.create({
        data: {
          eventId: inv.eventId,
          ticketTypeId: ticketType.id,
          holderName: inv.guestName,
          holderEmail: inv.guestEmail,
          qrCode: generateQrToken(),
          status: TicketStatus.PAID,
          paidAt: new Date(),
        },
      });

      const updated = await tx.invitation.update({
        where: { id: inv.id },
        data: {
          rsvpStatus: RsvpStatus.ATTENDING,
          respondedAt: new Date(),
          ticketId: ticket.id,
        },
      });

      return updated;
    });

    return ok({ invitation: { rsvpStatus: result.rsvpStatus, respondedAt: result.respondedAt, ticketId: result.ticketId } });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "message" in error && (error as { message?: string }).message === "EVENT_FULL") {
      return err("Event is at capacity", 409);
    }
    return handleApiError(error);
  }
}

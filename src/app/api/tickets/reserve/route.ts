import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok } from "@/lib/api";
import { reserveTicketSchema } from "@/lib/validators/ticket";
import { generateQrToken } from "@/lib/qr";
import { TicketStatus, EventStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = reserveTicketSchema.parse(body);

    const ticket = await db.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: data.eventId },
        include: { ticketTypes: true },
      });
      if (!event) throw new Error("EVENT_NOT_FOUND");
      if (event.status !== EventStatus.PUBLISHED) throw new Error("EVENT_NOT_PUBLISHED");

      const ticketType = event.ticketTypes.find((t) => t.id === data.ticketTypeId);
      if (!ticketType) throw new Error("TICKET_TYPE_NOT_FOUND");
      if (ticketType.isInvitationType) throw new Error("TICKET_TYPE_NOT_AVAILABLE");

      const now = new Date();
      if (ticketType.saleStart && now < ticketType.saleStart) throw new Error("SALE_NOT_STARTED");
      if (ticketType.saleEnd && now > ticketType.saleEnd) throw new Error("SALE_ENDED");

      // Enforce event capacity across active tickets
      const activeTickets = await tx.ticket.count({
        where: {
          eventId: event.id,
          status: { in: [TicketStatus.RESERVED, TicketStatus.PAID, TicketStatus.CHECKED_IN] },
        },
      });
      if (activeTickets >= event.capacity) throw new Error("EVENT_SOLD_OUT");

      // Atomically reserve ticket type seat
      const updated = await tx.ticketType.updateMany({
        where: {
          id: ticketType.id,
          sold: { lt: ticketType.quantity },
        },
        data: { sold: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("TICKET_TYPE_SOLD_OUT");

      const created = await tx.ticket.create({
        data: {
          eventId: event.id,
          ticketTypeId: ticketType.id,
          holderName: data.holderName,
          holderEmail: data.holderEmail.toLowerCase(),
          qrCode: generateQrToken(),
          status: TicketStatus.RESERVED,
        },
        include: { ticketType: true },
      });

      return created;
    });

    return ok({ ticket }, { status: 201 });
  } catch (error: unknown) {
    const map: Record<string, [string, number]> = {
      EVENT_NOT_FOUND: ["Event not found", 404],
      EVENT_NOT_PUBLISHED: ["Event is not published", 400],
      TICKET_TYPE_NOT_FOUND: ["Ticket type not found", 404],
      TICKET_TYPE_NOT_AVAILABLE: ["Ticket type not available", 400],
      SALE_NOT_STARTED: ["Ticket sales have not started", 400],
      SALE_ENDED: ["Ticket sales have ended", 400],
      EVENT_SOLD_OUT: ["Event is sold out", 409],
      TICKET_TYPE_SOLD_OUT: ["Ticket type is sold out", 409],
    };
    const message = error && typeof error === "object" && "message" in error ? String((error as { message?: string }).message) : "";
    if (message && map[message]) {
      const [msg, status] = map[message];
      return err(msg, status);
    }
    return handleApiError(error);
  }
}

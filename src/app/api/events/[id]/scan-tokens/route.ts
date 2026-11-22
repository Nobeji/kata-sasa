import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole } from "@/lib/api";
import { SCAN_ROLES, canManageEvent } from "@/lib/rbac";
import { TicketStatus } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { session, response } = await requireRole(SCAN_ROLES);
    if (response) return response;

    const event = await db.event.findUnique({ where: { id: params.id } });
    if (!event) return err("Event not found", 404);

    // Organizers can only scan their own events; scanners/admins allowed
    if (session!.user.role === "ORGANIZER" && !canManageEvent(session!.user.role, event.organizerId, session!.user.id)) {
      return err("Forbidden", 403);
    }

    const tickets = await db.ticket.findMany({
      where: {
        eventId: event.id,
        status: { in: [TicketStatus.PAID, TicketStatus.CHECKED_IN] },
      },
      select: {
        qrCode: true,
        status: true,
        holderName: true,
        ticketType: { select: { name: true } },
        checkin: { select: { checkedInAt: true } },
      },
    });

    return ok({
      event: { id: event.id, title: event.title },
      tokens: tickets.map((t) => ({
        qrCode: t.qrCode,
        status: t.status,
        holderName: t.holderName,
        ticketType: t.ticketType.name,
        checkedInAt: t.checkin?.checkedInAt || null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

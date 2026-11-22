import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole } from "@/lib/api";
import { createTicketTypeSchema } from "@/lib/validators/event";
import { EVENT_MANAGER_ROLES, canManageEvent } from "@/lib/rbac";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;
    const body = await req.json();
    const data = createTicketTypeSchema.parse(body);

    const event = await db.event.findUnique({ where: { id: params.id } });
    if (!event) return err("Event not found", 404);
    if (!canManageEvent(session!.user.role, event.organizerId, session!.user.id)) {
      return err("Forbidden", 403);
    }

    const ticketType = await db.ticketType.create({
      data: {
        eventId: event.id,
        name: data.name,
        price: data.price,
        currency: data.currency || "TZS",
        quantity: data.quantity,
        saleStart: data.saleStart ? new Date(data.saleStart) : null,
        saleEnd: data.saleEnd ? new Date(data.saleEnd) : null,
      },
    });

    return ok({ ticketType }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

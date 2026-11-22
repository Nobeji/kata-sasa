import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole, requireSession } from "@/lib/api";
import { updateEventSchema } from "@/lib/validators/event";
import { EVENT_MANAGER_ROLES, canManageEvent } from "@/lib/rbac";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    if (!session) return err("Unauthorized", 401);

    const event = await db.event.findUnique({
      where: { id: params.id },
      include: {
        ticketTypes: { orderBy: { createdAt: "asc" } },
        _count: { select: { tickets: true, invitations: true, checkins: true } },
      },
    });
    if (!event) return err("Event not found", 404);
    if (!canManageEvent(session.user.role, event.organizerId, session.user.id)) {
      return err("Forbidden", 403);
    }
    return ok({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;
    const body = await req.json();
    const data = updateEventSchema.parse(body);

    const existing = await db.event.findUnique({
      where: { id: params.id },
      include: { ticketTypes: true },
    });
    if (!existing) return err("Event not found", 404);
    if (!canManageEvent(session!.user.role, existing.organizerId, session!.user.id)) {
      return err("Forbidden", 403);
    }

    if (data.status === "PUBLISHED") {
      const capacity = data.capacity ?? existing.capacity;
      const ticketTypeCount = existing.ticketTypes.length;
      if (capacity <= 0) return err("Cannot publish: capacity must be greater than 0", 400);
      if (ticketTypeCount < 1) return err("Cannot publish: at least one ticket type is required", 400);
    }

    const startAt = data.startAt ? new Date(data.startAt) : existing.startAt;
    const endAt = data.endAt ? new Date(data.endAt) : existing.endAt;
    if (endAt <= startAt) return err("endAt must be after startAt", 400);

    const event = await db.event.update({
      where: { id: params.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.startAt !== undefined ? { startAt: new Date(data.startAt) } : {}),
        ...(data.endAt !== undefined ? { endAt: new Date(data.endAt) } : {}),
        ...(data.venueName !== undefined ? { venueName: data.venueName } : {}),
        ...(data.venueAddress !== undefined ? { venueAddress: data.venueAddress || null } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.coverImage !== undefined ? { coverImage: data.coverImage || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: { ticketTypes: true },
    });

    return ok({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

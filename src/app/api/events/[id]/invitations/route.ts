import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole } from "@/lib/api";
import { EVENT_MANAGER_ROLES, canManageEvent } from "@/lib/rbac";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;

    const event = await db.event.findUnique({ where: { id: params.id } });
    if (!event) return err("Event not found", 404);
    if (!canManageEvent(session!.user.role, event.organizerId, session!.user.id)) return err("Forbidden", 403);

    const invitations = await db.invitation.findMany({
      where: { eventId: event.id },
      orderBy: { sentAt: "desc" },
    });
    const counts = {
      attending: invitations.filter((i) => i.rsvpStatus === "ATTENDING").length,
      declined: invitations.filter((i) => i.rsvpStatus === "DECLINED").length,
      pending: invitations.filter((i) => i.rsvpStatus === "PENDING").length,
    };

    return ok({ invitations, counts, event: { id: event.id, title: event.title, slug: event.slug } });
  } catch (error) {
    return handleApiError(error);
  }
}

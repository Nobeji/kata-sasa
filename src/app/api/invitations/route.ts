import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole } from "@/lib/api";
import { createInvitationsSchema } from "@/lib/validators/invitation";
import { EVENT_MANAGER_ROLES, canManageEvent } from "@/lib/rbac";
import { createToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;
    const body = await req.json();
    const data = createInvitationsSchema.parse(body);

    const event = await db.event.findUnique({ where: { id: data.eventId } });
    if (!event) return err("Event not found", 404);
    if (!canManageEvent(session!.user.role, event.organizerId, session!.user.id)) return err("Forbidden", 403);

    const created = [];
    for (const guest of data.guests) {
      const inv = await db.invitation.create({
        data: {
          eventId: event.id,
          guestName: guest.name,
          guestEmail: guest.email.toLowerCase(),
          token: createToken(24),
          templateId: data.templateId,
        },
      });
      created.push(inv);
    }

    return ok({ invitations: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

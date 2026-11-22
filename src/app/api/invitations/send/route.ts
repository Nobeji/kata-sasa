import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole } from "@/lib/api";
import { sendInvitationsSchema } from "@/lib/validators/invitation";
import { EVENT_MANAGER_ROLES, canManageEvent } from "@/lib/rbac";
import { absoluteUrl } from "@/lib/utils";
import { renderInvitationTemplate } from "@/lib/invitations/templates";
import { sendEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;
    const body = await req.json();
    const data = sendInvitationsSchema.parse(body);

    const event = await db.event.findUnique({ where: { id: data.eventId } });
    if (!event) return err("Event not found", 404);
    if (!canManageEvent(session!.user.role, event.organizerId, session!.user.id)) return err("Forbidden", 403);

    const where: Prisma.InvitationWhereInput = { eventId: event.id };
    if (data.invitationIds?.length) where.id = { in: data.invitationIds };
    if (data.sendAllPending) where.rsvpStatus = "PENDING";

    const invitations = await db.invitation.findMany({ where });
    let sent = 0;
    for (const inv of invitations) {
      const rsvpUrl = absoluteUrl(`/invite/${inv.token}`);
      const html = renderInvitationTemplate({
        templateId: inv.templateId,
        guestName: inv.guestName,
        eventTitle: event.title,
        eventDescription: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        timezone: event.timezone,
        rsvpUrl,
        coverImage: event.coverImage,
      });
      await sendEmail({
        to: inv.guestEmail,
        subject: `You're invited: ${event.title}`,
        html,
        text: `Hi ${inv.guestName}, you're invited to ${event.title}. RSVP: ${rsvpUrl}`,
      });
      await db.invitation.update({ where: { id: inv.id }, data: { sentAt: new Date() } });
      sent++;
    }

    return ok({ sent });
  } catch (error) {
    return handleApiError(error);
  }
}

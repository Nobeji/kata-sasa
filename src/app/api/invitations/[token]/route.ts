import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok } from "@/lib/api";

type Ctx = { params: { token: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const invitation = await db.invitation.findUnique({
      where: { token: params.token },
      include: {
        event: {
          select: {
            id: true, title: true, description: true, startAt: true, endAt: true,
            venueName: true, venueAddress: true, timezone: true, coverImage: true, status: true,
          },
        },
      },
    });
    if (!invitation) return err("Invitation not found", 404);

    return ok({
      invitation: {
        guestName: invitation.guestName,
        guestEmail: invitation.guestEmail,
        rsvpStatus: invitation.rsvpStatus,
        respondedAt: invitation.respondedAt,
        templateId: invitation.templateId,
      },
      event: invitation.event,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

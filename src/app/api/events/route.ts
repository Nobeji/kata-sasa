import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { err, handleApiError, ok, requireRole } from "@/lib/api";
import { createEventSchema } from "@/lib/validators/event";
import { EVENT_MANAGER_ROLES } from "@/lib/rbac";
import { slugify } from "@/lib/utils";
import { Role } from "@prisma/client";

async function uniqueSlug(title: string) {
  const base = slugify(title) || "event";
  let slug = base;
  for (let i = 1; i < 100; i++) {
    const exists = await db.event.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;
    const body = await req.json();
    const data = createEventSchema.parse(body);

    if (new Date(data.endAt) <= new Date(data.startAt)) {
      return err("endAt must be after startAt", 400);
    }

    const event = await db.event.create({
      data: {
        title: data.title,
        slug: await uniqueSlug(data.title),
        description: data.description || null,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        venueName: data.venueName,
        venueAddress: data.venueAddress || null,
        timezone: data.timezone || "Africa/Dar_es_Salaam",
        capacity: data.capacity,
        coverImage: data.coverImage || null,
        organizerId: session!.user.id,
      },
    });

    return ok(event, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { session, response } = await requireRole(EVENT_MANAGER_ROLES);
    if (response) return response;

    const where = session!.user.role === Role.ADMIN ? {} : { organizerId: session!.user.id };
    const events = await db.event.findMany({
      where,
      include: {
        _count: { select: { tickets: true, invitations: true, ticketTypes: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

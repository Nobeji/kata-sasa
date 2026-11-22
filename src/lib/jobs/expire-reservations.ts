import { db } from "@/lib/db";
import { TicketStatus } from "@prisma/client";

export async function expireReservations() {
  const minutes = Number(process.env.RESERVATION_EXPIRY_MINUTES || 20);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const expired = await db.ticket.findMany({
    where: {
      status: TicketStatus.RESERVED,
      reservedAt: { lt: cutoff },
    },
    select: { id: true, ticketTypeId: true },
  });

  if (expired.length === 0) return { expired: 0 };

  const byType = new Map<string, number>();
  for (const t of expired) byType.set(t.ticketTypeId, (byType.get(t.ticketTypeId) || 0) + 1);

  await db.$transaction(async (tx) => {
    await tx.ticket.updateMany({
      where: { id: { in: expired.map((t) => t.id) }, status: TicketStatus.RESERVED },
      data: { status: TicketStatus.CANCELLED },
    });

    for (const [ticketTypeId, count] of Array.from(byType.entries())) {
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: { sold: { decrement: count } },
      });
    }
  });

  // Clamp sold to >= 0 safety (in case of drift)
  await db.ticketType.updateMany({ where: { sold: { lt: 0 } }, data: { sold: 0 } });

  return { expired: expired.length };
}

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, requireRole } from "@/lib/api";
import { checkinSchema } from "@/lib/validators/checkin";
import { SCAN_ROLES } from "@/lib/rbac";
import { CheckinResult, TicketStatus } from "@prisma/client";
import { decideCheckin } from "@/lib/checkin/decision";

async function logAttempt(params: {
  eventId: string;
  ticketId?: string | null;
  qrCode: string;
  result: CheckinResult;
  scannedBy?: string | null;
  deviceInfo?: string | null;
}) {
  await db.checkinAttempt.create({
    data: {
      eventId: params.eventId,
      ticketId: params.ticketId ?? null,
      qrCode: params.qrCode,
      result: params.result,
      scannedBy: params.scannedBy ?? null,
      deviceInfo: params.deviceInfo ?? null,
    },
  }).catch(console.error);
}

export async function POST(req: NextRequest) {
  try {
    const { session, response } = await requireRole(SCAN_ROLES);
    if (response) return response;

    const body = await req.json();
    const data = checkinSchema.parse(body);
    const scannerId = session!.user.id;

    const ticket = await db.ticket.findUnique({
      where: { qrCode: data.qrCode },
      include: { ticketType: true, checkin: true, event: true },
    });

    const decision = decideCheckin(
      ticket
        ? {
            eventId: ticket.eventId,
            status: ticket.status,
            holderName: ticket.holderName,
            ticketType: { name: ticket.ticketType.name },
            checkin: ticket.checkin ? { checkedInAt: ticket.checkin.checkedInAt } : null,
          }
        : null,
      data.eventId,
    );
    if (decision.result !== "SUCCESS") {
      const auditMap = {
        INVALID: CheckinResult.INVALID,
        WRONG_EVENT: CheckinResult.WRONG_EVENT,
        ALREADY_CHECKED_IN: CheckinResult.ALREADY_CHECKED_IN,
      } as const;
      await logAttempt({
        eventId: data.eventId,
        ticketId: ticket?.id,
        qrCode: data.qrCode,
        result: auditMap[decision.result],
        scannedBy: scannerId,
        deviceInfo: data.deviceInfo,
      });
      return ok(decision);
    }

    if (!ticket) return ok({ result: "INVALID" });

    try {
      const result = await db.$transaction(async (tx) => {
        const fresh = await tx.ticket.findUnique({ where: { id: ticket.id }, include: { checkin: true, ticketType: true } });
        if (!fresh) return { result: "INVALID" as const };
        if (fresh.status === TicketStatus.CHECKED_IN) {
          return { result: "ALREADY_CHECKED_IN" as const, checkedInAt: fresh.checkin?.checkedInAt || new Date() };
        }
        if (fresh.status !== TicketStatus.PAID) {
          return { result: "INVALID" as const };
        }

        await tx.checkin.create({
          data: {
            eventId: data.eventId,
            ticketId: fresh.id,
            scannedBy: scannerId,
            deviceInfo: data.deviceInfo || null,
          },
        });
        await tx.ticket.update({ where: { id: fresh.id }, data: { status: TicketStatus.CHECKED_IN } });
        return { result: "SUCCESS" as const, holderName: fresh.holderName, ticketType: fresh.ticketType.name };
      });

      const auditResult = result.result === "SUCCESS" ? CheckinResult.SUCCESS
        : result.result === "ALREADY_CHECKED_IN" ? CheckinResult.ALREADY_CHECKED_IN
        : CheckinResult.INVALID;
      await logAttempt({ eventId: data.eventId, ticketId: ticket.id, qrCode: data.qrCode, result: auditResult, scannedBy: scannerId, deviceInfo: data.deviceInfo });
      return ok(result);
    } catch (e: unknown) {
      // Unique constraint on checkin.ticketId - treat as already checked in
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        const existing = await db.checkin.findUnique({ where: { ticketId: ticket.id } });
        await logAttempt({ eventId: data.eventId, ticketId: ticket.id, qrCode: data.qrCode, result: CheckinResult.ALREADY_CHECKED_IN, scannedBy: scannerId, deviceInfo: data.deviceInfo });
        return ok({ result: "ALREADY_CHECKED_IN", checkedInAt: existing?.checkedInAt || new Date() });
      }
      throw e;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

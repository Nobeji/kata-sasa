export type CheckinTicket = {
  eventId: string;
  status: "RESERVED" | "PAID" | "CHECKED_IN" | "CANCELLED";
  holderName: string;
  ticketType: { name: string };
  checkin?: { checkedInAt: Date | string } | null;
} | null;

export type CheckinDecision =
  | { result: "INVALID" }
  | { result: "WRONG_EVENT" }
  | { result: "ALREADY_CHECKED_IN"; checkedInAt: Date | string }
  | { result: "SUCCESS"; holderName: string; ticketType: string };

export function decideCheckin(ticket: CheckinTicket, eventId: string): CheckinDecision {
  if (!ticket) return { result: "INVALID" };
  if (ticket.eventId !== eventId) return { result: "WRONG_EVENT" };
  if (ticket.status === "CHECKED_IN") {
    return { result: "ALREADY_CHECKED_IN", checkedInAt: ticket.checkin?.checkedInAt || new Date().toISOString() };
  }
  if (ticket.status !== "PAID") return { result: "INVALID" };
  return { result: "SUCCESS", holderName: ticket.holderName, ticketType: ticket.ticketType.name };
}

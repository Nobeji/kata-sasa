import { describe, expect, it } from "vitest";
import { decideCheckin } from "@/lib/checkin/decision";

describe("decideCheckin", () => {
  it("returns INVALID when ticket is not found", () => {
    expect(decideCheckin(null, "evt_1")).toEqual({ result: "INVALID" });
  });

  it("returns WRONG_EVENT when ticket belongs to another event", () => {
    const ticket = {
      eventId: "evt_2",
      status: "PAID" as const,
      holderName: "Grace",
      ticketType: { name: "Regular" },
      checkin: null,
    };
    expect(decideCheckin(ticket, "evt_1")).toEqual({ result: "WRONG_EVENT" });
  });

  it("returns ALREADY_CHECKED_IN for checked-in tickets", () => {
    const checkedInAt = new Date("2026-01-01T10:00:00Z");
    const ticket = {
      eventId: "evt_1",
      status: "CHECKED_IN" as const,
      holderName: "Grace",
      ticketType: { name: "Regular" },
      checkin: { checkedInAt },
    };
    expect(decideCheckin(ticket, "evt_1")).toEqual({ result: "ALREADY_CHECKED_IN", checkedInAt });
  });

  it("returns INVALID when ticket is not paid", () => {
    const ticket = {
      eventId: "evt_1",
      status: "RESERVED" as const,
      holderName: "Grace",
      ticketType: { name: "Regular" },
      checkin: null,
    };
    expect(decideCheckin(ticket, "evt_1")).toEqual({ result: "INVALID" });
  });

  it("returns SUCCESS for a paid ticket in the same event", () => {
    const ticket = {
      eventId: "evt_1",
      status: "PAID" as const,
      holderName: "Grace",
      ticketType: { name: "VIP" },
      checkin: null,
    };
    expect(decideCheckin(ticket, "evt_1")).toEqual({
      result: "SUCCESS",
      holderName: "Grace",
      ticketType: "VIP",
    });
  });
});

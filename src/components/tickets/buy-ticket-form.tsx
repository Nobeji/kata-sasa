"use client";

import { FormEvent, useMemo, useState } from "react";

type TT = { id: string; name: string; price: number; currency: string; quantity: number; sold: number };

export function BuyTicketForm({ eventId, ticketTypes }: { eventId: string; ticketTypes: TT[] }) {
  const available = useMemo(() => ticketTypes.filter((t) => t.sold < t.quantity), [ticketTypes]);
  const [ticketTypeId, setTicketTypeId] = useState(available[0]?.id || "");
  const [holderName, setHolderName] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const reserveRes = await fetch("/api/tickets/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketTypeId, holderName, holderEmail }),
      });
      const reserveData = await reserveRes.json();
      if (!reserveRes.ok) throw new Error(reserveData.error || "Failed to reserve ticket");

      const checkoutRes = await fetch("/api/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: reserveData.ticket.id }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || "Failed to start checkout");

      if (checkoutData.url) {
        window.location.href = checkoutData.url;
        return;
      }
      // Free/comped ticket path
      window.location.href = `/tickets/success?ticketId=${reserveData.ticket.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-semibold">Buy ticket</h2>
      {available.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Tickets are currently unavailable.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Ticket type</label>
            <select value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)} required>
              {available.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.currency} {t.price} ({t.quantity - t.sold} left)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <input value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" value={holderEmail} onChange={(e) => setHolderEmail(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60">
            {loading ? "Processing..." : "Pay"}
          </button>
          <p className="text-xs text-slate-500">Secure checkout via Stripe test mode.</p>
        </form>
      )}
    </div>
  );
}

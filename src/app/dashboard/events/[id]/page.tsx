"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type TicketType = { id: string; name: string; price: number; currency: string; quantity: number; sold: number };
type EventDetail = {
  id: string; slug: string; title: string; description?: string | null; startAt: string; endAt: string;
  venueName: string; venueAddress?: string | null; timezone: string; capacity: number; coverImage?: string | null;
  status: string; ticketTypes: TicketType[]; _count: { tickets: number; invitations: number; checkins: number };
};

export default function ManageEventPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tt, setTt] = useState({ name: "", price: 0, currency: "TZS", quantity: 50 });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/events/${id}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed to load event"); return; }
    setEvent(data.event);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addTicketType(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/events/${id}/ticket-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...tt, price: Number(tt.price), quantity: Number(tt.quantity) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to add ticket type"); return; }
    setTt({ name: "", price: 0, currency: "TZS", quantity: 50 });
    await load();
  }

  async function setStatus(status: string) {
    setError("");
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to update status"); return; }
    await load();
  }

  if (loading) return <p>Loading...</p>;
  if (!event) return <p className="text-red-600">{error || "Event not found"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{event.status}</span>
          </div>
          <p className="text-sm text-slate-600">{event.venueName} · {new Date(event.startAt).toLocaleString()} ({event.timezone})</p>
          <p className="text-xs text-slate-500 mt-1">Capacity: {event.capacity} · Tickets: {event._count.tickets} · Invitations: {event._count.invitations} · Check-ins: {event._count.checkins}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status !== "PUBLISHED" && <button onClick={() => setStatus("PUBLISHED")} className="bg-green-600 text-white hover:bg-green-700">Publish</button>}
          {event.status === "PUBLISHED" && <button onClick={() => setStatus("CANCELLED")} className="bg-red-600 text-white hover:bg-red-700">Cancel</button>}
          {event.status === "PUBLISHED" && <Link href={`/events/${event.slug}`} className="border border-slate-300 bg-white hover:bg-slate-50">Public page</Link>}
          <Link href={`/dashboard/events/${event.id}/invitations`} className="border border-slate-300 bg-white hover:bg-slate-50">Invitations</Link>
          <Link href={`/scan/${event.id}`} className="border border-slate-300 bg-white hover:bg-slate-50">Scanner</Link>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Ticket types</h2>
        <div className="mt-4 space-y-3">
          {event.ticketTypes.length === 0 && <p className="text-sm text-slate-500">No ticket types yet. Add at least one before publishing.</p>}
          {event.ticketTypes.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-slate-600">{t.currency} {t.price} · {t.sold}/{t.quantity} sold</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addTicketType} className="mt-6 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Name</label>
            <input value={tt.name} onChange={(e) => setTt({ ...tt, name: e.target.value })} required placeholder="VIP" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Price ({tt.currency})</label>
            <input type="number" min={0} value={tt.price} onChange={(e) => setTt({ ...tt, price: Number(e.target.value) })} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Quantity</label>
            <input type="number" min={1} value={tt.quantity} onChange={(e) => setTt({ ...tt, quantity: Number(e.target.value) })} required />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60">
              {saving ? "Adding..." : "Add ticket type"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Event details</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Description</dt><dd>{event.description || "—"}</dd></div>
          <div><dt className="text-slate-500">Venue address</dt><dd>{event.venueAddress || "—"}</dd></div>
          <div><dt className="text-slate-500">Starts</dt><dd>{new Date(event.startAt).toLocaleString()}</dd></div>
          <div><dt className="text-slate-500">Ends</dt><dd>{new Date(event.endAt).toLocaleString()}</dd></div>
        </dl>
      </section>
    </div>
  );
}

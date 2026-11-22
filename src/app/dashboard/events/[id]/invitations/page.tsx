"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Invitation = {
  id: string; guestName: string; guestEmail: string; templateId: string;
  rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED"; sentAt?: string | null; respondedAt?: string | null; token: string;
};

const TEMPLATES = [
  { id: "elegant", name: "Elegant", desc: "Classic serif, warm tones." },
  { id: "modern", name: "Modern", desc: "Dark, bold, contemporary." },
  { id: "minimal", name: "Minimal", desc: "Clean, light, understated." },
];

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const start = nameIdx >= 0 && emailIdx >= 0 ? 1 : 0;
  const rows: { name: string; email: string }[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (nameIdx >= 0 && emailIdx >= 0) {
      const name = cols[nameIdx]; const email = cols[emailIdx];
      if (name && email) rows.push({ name, email });
    } else if (cols.length >= 2) {
      if (cols[0] && cols[1]) rows.push({ name: cols[0], email: cols[1] });
    }
  }
  return rows;
}

export default function InvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [counts, setCounts] = useState({ attending: 0, declined: 0, pending: 0 });
  const [eventTitle, setEventTitle] = useState("");
  const [templateId, setTemplateId] = useState("elegant");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/events/${id}/invitations`);
    const data = await res.json();
    if (res.ok) {
      setInvitations(data.invitations);
      setCounts(data.counts);
      setEventTitle(data.event?.title || "");
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function addGuest() {
    if (!guestName || !guestEmail) return;
    setGuests((g) => [...g, { name: guestName, email: guestEmail }]);
    setGuestName(""); setGuestEmail("");
  }

  async function onCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    setGuests((g) => [...g, ...rows]);
  }

  async function createInvitations(e: FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    const payloadGuests = [...guests];
    if (guestName && guestEmail) payloadGuests.push({ name: guestName, email: guestEmail });
    if (payloadGuests.length === 0) { setError("Add at least one guest"); return; }
    setLoading(true);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: id, templateId, guests: payloadGuests }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setGuests([]); setGuestName(""); setGuestEmail("");
    setMessage(`Created ${data.invitations?.length || 0} invitations.`);
    await load();
  }

  async function sendAllPending() {
    setError(""); setMessage("");
    const res = await fetch("/api/invitations/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: id, sendAllPending: true }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to send"); return; }
    setMessage(`Sent ${data.sent} invitation(s).`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invitations</h1>
        <p className="text-sm text-slate-600">{eventTitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Attending</p><p className="text-2xl font-bold text-green-700">{counts.attending}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Declined</p><p className="text-2xl font-bold text-red-700">{counts.declined}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Pending</p><p className="text-2xl font-bold text-amber-700">{counts.pending}</p></div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create invitations</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} className={`rounded-lg border p-4 text-left ${templateId === t.id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-slate-600">{t.desc}</p>
            </button>
          ))}
        </div>

        <form onSubmit={createInvitations} className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Guest name</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Guest email</label>
              <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={addGuest} className="w-full border border-slate-300 bg-white hover:bg-slate-50">Add guest</button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Upload CSV (name,email)</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
          </div>

          {guests.length > 0 && (
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="font-medium">{guests.length} guest(s) ready:</p>
              <p className="text-slate-600">{guests.slice(0, 5).map((g) => g.email).join(", ")}{guests.length > 5 ? "..." : ""}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60">
              {loading ? "Creating..." : "Create invitations"}
            </button>
            <button type="button" onClick={sendAllPending} className="border border-slate-300 bg-white hover:bg-slate-50">Send all pending</button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Invitation list</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="py-2">Guest</th><th>Email</th><th>Template</th><th>RSVP</th><th>Sent</th><th>Link</th></tr></thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="py-2">{inv.guestName}</td>
                  <td>{inv.guestEmail}</td>
                  <td>{inv.templateId}</td>
                  <td>{inv.rsvpStatus}</td>
                  <td>{inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : "—"}</td>
                  <td><a className="text-slate-700 underline" href={`/invite/${inv.token}`} target="_blank">Open</a></td>
                </tr>
              ))}
              {invitations.length === 0 && <tr><td className="py-4 text-slate-500" colSpan={6}>No invitations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

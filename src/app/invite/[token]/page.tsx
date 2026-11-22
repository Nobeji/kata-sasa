"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Data = {
  invitation: { guestName: string; rsvpStatus: "PENDING" | "ATTENDING" | "DECLINED"; respondedAt?: string | null };
  event: { title: string; description?: string | null; startAt: string; endAt: string; venueName: string; venueAddress?: string | null; timezone: string; coverImage?: string | null; status: string };
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/invitations/${token}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error || "Invitation not found"); return; }
    setData(json);
  }

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(rsvpStatus: "ATTENDING" | "DECLINED") {
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/invitations/${token}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpStatus }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error || "Failed to submit RSVP"); return; }
    await load();
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  if (error && !data) return <main className="flex min-h-screen items-center justify-center text-red-600">{error}</main>;
  if (!data) return null;

  const { event, invitation } = data;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {event.coverImage && <img src={event.coverImage} alt={event.title} className="h-56 w-full object-cover" />}
        <div className="p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Digital invitation</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{event.title}</h1>
          <p className="mt-2 text-slate-600">Dear {invitation.guestName}, you&apos;re invited.</p>
          {event.description && <p className="mt-4 whitespace-pre-wrap text-slate-700">{event.description}</p>}

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">When</dt><dd className="font-medium">{new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}</dd></div>
            <div><dt className="text-slate-500">Timezone</dt><dd className="font-medium">{event.timezone}</dd></div>
            <div><dt className="text-slate-500">Where</dt><dd className="font-medium">{event.venueName}</dd></div>
            <div><dt className="text-slate-500">Address</dt><dd className="font-medium">{event.venueAddress || "—"}</dd></div>
          </dl>

          <div className="mt-8 rounded-xl bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-700">RSVP status: <span className="font-bold">{invitation.rsvpStatus}</span></p>
            {invitation.respondedAt && <p className="text-xs text-slate-500">Responded: {new Date(invitation.respondedAt).toLocaleString()}</p>}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button onClick={() => respond("ATTENDING")} disabled={submitting} className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
                {submitting ? "Saving..." : "Yes, I&apos;ll attend"}
              </button>
              <button onClick={() => respond("DECLINED")} disabled={submitting} className="bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-60">
                Can&apos;t make it
              </button>
            </div>
            {invitation.rsvpStatus === "ATTENDING" && (
              <p className="mt-3 text-sm text-green-700">Your attendance is confirmed. A ticket has been generated for check-in.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

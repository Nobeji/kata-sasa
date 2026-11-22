import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export default async function DashboardEventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.ORGANIZER) redirect("/");

  const where = session.user.role === Role.ADMIN ? {} : { organizerId: session.user.id };
  const events = await db.event.findMany({
    where,
    include: { _count: { select: { ticketTypes: true, tickets: true, invitations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-slate-600">Create, publish, and manage your events.</p>
        </div>
        <Link href="/dashboard/events/new" className="bg-slate-900 text-white hover:bg-slate-700">New event</Link>
      </div>

      <div className="grid gap-4">
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            No events yet. Create your first event.
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{event.title}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{event.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{event.venueName} · {new Date(event.startAt).toLocaleString()}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {event._count.ticketTypes} ticket types · {event._count.tickets} tickets · {event._count.invitations} invitations
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/events/${event.id}`} className="border border-slate-300 bg-white hover:bg-slate-50">Manage</Link>
                {event.status === "PUBLISHED" && (
                  <Link href={`/events/${event.slug}`} className="border border-slate-300 bg-white hover:bg-slate-50">Public page</Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

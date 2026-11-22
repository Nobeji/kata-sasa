import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BuyTicketForm } from "@/components/tickets/buy-ticket-form";

type Props = { params: { slug: string } };

export default async function PublicEventPage({ params }: Props) {
  const event = await db.event.findUnique({
    where: { slug: params.slug },
    include: {
      ticketTypes: {
        where: { isInvitationType: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {event.coverImage && (
            <img src={event.coverImage} alt={event.title} className="h-64 w-full object-cover" />
          )}
          <div className="grid gap-8 p-8 md:grid-cols-5">
            <div className="md:col-span-3">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Public event</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{event.title}</h1>
              <p className="mt-4 whitespace-pre-wrap text-slate-700">{event.description}</p>
              <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Date & time</dt><dd className="font-medium">{new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}</dd></div>
                <div><dt className="text-slate-500">Timezone</dt><dd className="font-medium">{event.timezone}</dd></div>
                <div><dt className="text-slate-500">Venue</dt><dd className="font-medium">{event.venueName}</dd></div>
                <div><dt className="text-slate-500">Address</dt><dd className="font-medium">{event.venueAddress || "—"}</dd></div>
              </dl>
            </div>
            <div className="md:col-span-2">
              <BuyTicketForm eventId={event.id} ticketTypes={event.ticketTypes.map(t => ({ id: t.id, name: t.name, price: t.price, currency: t.currency, quantity: t.quantity, sold: t.sold }))} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

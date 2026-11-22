import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 inline-flex rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
        Kata Sasa
      </div>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
        Events, tickets, and invitations in one platform.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        Create events, sell QR tickets, scan attendees at the door, and send digital invitations with RSVP tracking.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/dashboard/events" className="bg-slate-900 px-5 py-3 text-white hover:bg-slate-700">
          Organizer Dashboard
        </Link>
        <Link href="/login" className="border border-slate-300 bg-white px-5 py-3 text-slate-900 hover:bg-slate-100">
          Sign in
        </Link>
      </div>
    </main>
  );
}

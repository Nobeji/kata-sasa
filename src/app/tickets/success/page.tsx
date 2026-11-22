import Link from "next/link";

export default function TicketSuccessPage({ searchParams }: { searchParams: { ticketId?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">✓</div>
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="mt-3 text-slate-600">Your ticket has been confirmed. A confirmation email with your QR code has been sent (or logged in dev).</p>
        {searchParams.ticketId && <p className="mt-2 text-xs text-slate-500">Ticket ID: {searchParams.ticketId}</p>}
        <Link href="/" className="mt-6 inline-flex bg-slate-900 text-white hover:bg-slate-700">Back to home</Link>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function TicketCancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Payment cancelled</h1>
        <p className="mt-3 text-slate-600">Your reservation is still held for a limited time. You can return to the event page to try again.</p>
        <Link href="/" className="mt-6 inline-flex bg-slate-900 text-white hover:bg-slate-700">Back to home</Link>
      </div>
    </main>
  );
}

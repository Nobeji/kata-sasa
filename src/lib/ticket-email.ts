import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { qrToDataUrl } from "@/lib/qr";

export async function sendTicketConfirmation(ticketId: string) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { event: true, ticketType: true },
  });
  if (!ticket) return;

  const qrDataUrl = await qrToDataUrl(ticket.qrCode);
  const subject = `Your ticket for ${ticket.event.title}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="margin-bottom:8px">You're confirmed!</h1>
      <p>Your ticket for <strong>${ticket.event.title}</strong> is ready.</p>
      <p><strong>Holder:</strong> ${ticket.holderName}<br/>
         <strong>Ticket:</strong> ${ticket.ticketType.name}<br/>
         <strong>Venue:</strong> ${ticket.event.venueName}<br/>
         <strong>Starts:</strong> ${new Date(ticket.event.startAt).toLocaleString()}</p>
      <p>Show this QR code at check-in:</p>
      <img src="${qrDataUrl}" alt="Ticket QR" style="width:240px;height:240px;border:1px solid #ddd;padding:8px" />
      <p style="color:#666;font-size:12px">Ticket ID: ${ticket.id}</p>
    </div>
  `;

  await sendEmail({
    to: ticket.holderEmail,
    subject,
    html,
    text: `Your ticket for ${ticket.event.title}. Ticket ID: ${ticket.id}. QR token: ${ticket.qrCode}`,
  });
}

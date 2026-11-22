type TemplateInput = {
  templateId: string;
  guestName: string;
  eventTitle: string;
  eventDescription?: string | null;
  startAt: Date;
  endAt: Date;
  venueName: string;
  venueAddress?: string | null;
  timezone: string;
  rsvpUrl: string;
  coverImage?: string | null;
};

function base(content: string, bg: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px;background:${bg};font-family:Arial,Helvetica,sans-serif;">${content}</body></html>`;
}

export function renderInvitationTemplate(input: TemplateInput) {
  const date = new Date(input.startAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const end = new Date(input.endAt).toLocaleString("en-US", { timeStyle: "short" });
  const venue = [input.venueName, input.venueAddress].filter(Boolean).join(", ");

  if (input.templateId === "modern") {
    return base(`
      <div style="max-width:680px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:20px;overflow:hidden;">
        ${input.coverImage ? `<img src="${input.coverImage}" alt="" style="width:100%;height:260px;object-fit:cover;"/>` : ""}
        <div style="padding:40px;">
          <p style="letter-spacing:.2em;text-transform:uppercase;color:#94a3b8;font-size:12px;margin:0 0 12px;">You're invited</p>
          <h1 style="margin:0 0 16px;font-size:40px;line-height:1.1;color:#fff;">${input.eventTitle}</h1>
          <p style="font-size:18px;color:#cbd5e1;margin:0 0 24px;">Hello ${input.guestName}, we'd love to have you join us.</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;"><strong style="color:#fff;">When:</strong> ${date} - ${end} (${input.timezone})</p>
            <p style="margin:0;"><strong style="color:#fff;">Where:</strong> ${venue}</p>
          </div>
          ${input.eventDescription ? `<p style="color:#cbd5e1;line-height:1.6;">${input.eventDescription}</p>` : ""}
          <a href="${input.rsvpUrl}" style="display:inline-block;margin-top:24px;background:#38bdf8;color:#0f172a;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold;">RSVP now</a>
        </div>
      </div>`, "#020617");
  }

  if (input.templateId === "minimal") {
    return base(`
      <div style="max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:48px;border:1px solid #e5e7eb;">
        <p style="font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#6b7280;margin:0 0 24px;">Invitation</p>
        <h1 style="font-size:36px;font-weight:500;margin:0 0 24px;line-height:1.2;">${input.eventTitle}</h1>
        <p style="margin:0 0 24px;color:#374151;">For ${input.guestName}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="margin:0 0 8px;">${date} - ${end}</p>
        <p style="margin:0 0 8px;">${venue}</p>
        <p style="margin:0 0 24px;color:#6b7280;">${input.timezone}</p>
        ${input.eventDescription ? `<p style="line-height:1.7;color:#374151;">${input.eventDescription}</p>` : ""}
        <a href="${input.rsvpUrl}" style="display:inline-block;margin-top:24px;color:#111827;text-decoration:none;border-bottom:1px solid #111827;padding-bottom:4px;">Respond to invitation</a>
      </div>`, "#f9fafb");
  }

  // elegant default
  return base(`
    <div style="max-width:640px;margin:0 auto;background:#fffaf5;color:#3f2f23;border:1px solid #eadccf;padding:48px;">
      <div style="text-align:center;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#8a6a52;">You Are Cordially Invited</p>
        <h1 style="margin:0 0 16px;font-size:44px;font-weight:normal;font-family:Georgia,serif;line-height:1.2;">${input.eventTitle}</h1>
        <p style="margin:0 0 32px;font-size:18px;">Dear ${input.guestName},</p>
      </div>
      ${input.coverImage ? `<img src="${input.coverImage}" alt="" style="width:100%;height:240px;object-fit:cover;margin-bottom:24px;"/>` : ""}
      <p style="line-height:1.8;text-align:center;margin:0 0 24px;">${input.eventDescription || "We would be honored by your presence at this special event."}</p>
      <div style="text-align:center;padding:24px 0;border-top:1px solid #eadccf;border-bottom:1px solid #eadccf;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:18px;font-family:Georgia,serif;">${date}</p>
        <p style="margin:0 0 8px;">${end} · ${input.timezone}</p>
        <p style="margin:0;color:#6b5543;">${venue}</p>
      </div>
      <div style="text-align:center;">
        <a href="${input.rsvpUrl}" style="display:inline-block;background:#7c5c43;color:#fff;text-decoration:none;padding:14px 28px;letter-spacing:.08em;text-transform:uppercase;font-size:12px;">RSVP</a>
      </div>
    </div>`, "#f5efe8");
}

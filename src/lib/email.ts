import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function hasSmtp() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(input: SendEmailInput) {
  const from = process.env.EMAIL_FROM || "noreply@katasasa.local";

  // Dev/default: log to console
  if (!hasSmtp() && !process.env.RESEND_API_KEY) {
    console.log("\n=== EMAIL (dev log) ===");
    console.log("From:", from);
    console.log("To:", input.to);
    console.log("Subject:", input.subject);
    console.log("Text:", input.text || "");
    console.log("HTML:\n", input.html);
    console.log("=== END EMAIL ===\n");
    return { ok: true, provider: "console" as const };
  }

  if (hasSmtp()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({ from, ...input });
    return { ok: true, provider: "smtp" as const };
  }

  // Resend fallback via HTTP to avoid extra dependency; simple fetch
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html, text: input.text }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error: ${res.status} ${body}`);
    }
    return { ok: true, provider: "resend" as const };
  }

  return { ok: true, provider: "console" as const };
}

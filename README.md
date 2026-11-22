# Kata Sasa — Unified Event Platform MVP

Kata Sasa is a unified event platform combining **event management**, **online ticketing with QR check-in**, and **digital invitation cards with RSVP tracking** in one system. All modules share the same `event_id`.

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes + Prisma ORM
- **Database**: PostgreSQL (Docker Compose provided for local dev)
- **Auth**: NextAuth (Credentials, JWT) with role-based access: `ADMIN`, `ORGANIZER`, `SCANNER`, `GUEST`
- **Payments**: Stripe test mode via a pluggable payment adapter (`src/lib/payments`)
- **QR**: `qrcode` for generation, `html5-qrcode` for browser camera scanning
- **Email**: Nodemailer/Resend adapter; defaults to console logging in dev
- **Invitations**: Server-rendered HTML templates (Elegant, Modern, Minimal)

## Project structure

```text
prisma/
  schema.prisma          # Data model (Event, TicketType, Ticket, Invitation, Checkin, CheckinAttempt)
  seed.ts                # Seed data
src/
  app/
    api/                 # API route handlers
    dashboard/           # Organizer/admin UI
    events/[slug]/       # Public event page
    invite/[token]/      # Public RSVP page
    scan/[eventId]/      # Scanner UI
    tickets/             # Payment success/cancel pages
  components/            # UI components
  lib/
    auth.ts, rbac.ts     # Auth and role checks
    validators/          # Zod schemas
    payments/            # Stripe adapter + M-Pesa stub
    invitations/         # HTML templates
    checkin/             # Check-in decision logic + offline IndexedDB helpers
    jobs/                # Reservation expiry job
tests/
  checkin.test.ts        # Basic check-in logic tests
```

## Setup

### 1. Prerequisites

- Node.js 20+
- npm
- Docker (for local PostgreSQL) or an existing PostgreSQL database

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret for NextAuth JWT/session signing |
| `STRIPE_SECRET_KEY` | Stripe test secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `EMAIL_FROM` | Sender email |
| `RESEND_API_KEY` | Optional; if set, emails sent via Resend |
| `SMTP_*` | Optional SMTP config; if set, emails sent via SMTP |
| `APP_URL` | Public base URL used in emails/redirects |
| `RESERVATION_EXPIRY_MINUTES` | Reservation hold time (default 20) |
| `CRON_SECRET` | Optional bearer secret for expiry job endpoint |

If no email provider is configured, emails are **logged to the console** in development.

### 4. Start PostgreSQL

```bash
docker compose up -d
```

### 5. Generate Prisma client and migrate

```bash
npm run db:generate
npm run db:migrate -- --name init
```

For quick local prototyping without migrations, you can also use:

```bash
npm run db:push
```

### 6. Seed the database

```bash
npm run db:seed
```

Seed creates:
- Organizer: `organizer@katasasa.test` / `Password123!`
- Scanner: `scanner@katasasa.test` / `Password123!`
- Admin: `admin@katasasa.test` / `Password123!`
- Published event: `dar-tech-summit-2026`
- 2 ticket types: Regular, VIP (+ Invitation type)
- 1 paid ticket (with QR token logged in seed output)
- 1 pending invitation

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing the 4 core flows

### Flow 1 — Create & Publish Event

1. Sign in as `organizer@katasasa.test` / `Password123!`.
2. Go to **Dashboard > Events > New event**.
3. Fill in title, date/time, timezone, venue, capacity, and cover image (URL or upload).
4. After creation, on the manage page add at least one ticket type (name, price, quantity).
5. Click **Publish**. Publishing is blocked if capacity <= 0 or no ticket types exist.
6. Open the public page at `/events/[slug]` (link shown when published).

### Flow 2 — Buy Ticket & Generate QR

1. Open a published event public page `/events/[slug]`.
2. Select a ticket type, enter name + email, click **Pay**.
3. The system creates a `RESERVED` ticket and starts Stripe Checkout (test mode).
4. Complete payment with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. Stripe webhook (`POST /api/webhooks/stripe`) marks ticket `PAID`, sets `paidAt`, and sends confirmation email with QR (console log in dev).
6. For local webhook testing, use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the emitted `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

**Reservation expiry:** reservations older than 20 minutes can be expired by calling:

```bash
curl -X POST http://localhost:3000/api/jobs/expire-reservations
```

If `CRON_SECRET` is set, include `Authorization: Bearer <CRON_SECRET>`. In production, schedule this endpoint (e.g. Vercel Cron).

### Flow 3 — Check-in Scanner (offline-first)

1. Sign in as `scanner@katasasa.test` or organizer.
2. Open `/scan/[eventId]` on a phone or browser with camera access.
3. Scan a ticket QR code. The UI calls `POST /api/checkin` with `{ qrCode, eventId }`.
4. Results:
   - `SUCCESS` (green): paid ticket checked in
   - `ALREADY_CHECKED_IN` (yellow): shows previous check-in time
   - `WRONG_EVENT` / `INVALID` (red): rejected
5. Offline behavior: the scanner caches valid event ticket tokens in IndexedDB. If wifi drops, scans are validated against local cache, queued locally, and synced when back online. Server remains authoritative.

### Flow 4 — Digital Invitation + RSVP → Auto Ticket

1. As organizer, open **Dashboard > Events > [event] > Invitations**.
2. Pick a template: Elegant, Modern, or Minimal.
3. Add guests manually or upload CSV with columns `name,email`.
4. Click **Create invitations**. Each guest gets a unique token and RSVP link `/invite/[token]`.
5. Click **Send all pending** to send invitation emails (console logged in dev).
6. Open an invite link `/invite/[token]`.
7. Click **Yes, I'll attend**: RSVP becomes `ATTENDING`, `respondedAt` is set, and the system auto-creates a `PAID` price-0 ticket linked to the default `Invitation` ticket type; `ticketId` is stored on the invitation.
8. Click **Can't make it**: RSVP becomes `DECLINED`.
9. The organizer invitations dashboard shows RSVP counts (attending/declined/pending).

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` | Create event |
| GET | `/api/events` | List organizer's own events |
| GET | `/api/events/:id` | Event detail |
| PATCH | `/api/events/:id` | Update / publish / cancel |
| POST | `/api/events/:id/ticket-types` | Add ticket type |
| POST | `/api/tickets/reserve` | Reserve a seat |
| POST | `/api/tickets/checkout` | Start Stripe checkout |
| POST | `/api/webhooks/stripe` | Handle Stripe payment success |
| POST | `/api/checkin` | Verify + record check-in |
| POST | `/api/invitations` | Create invitations (bulk) |
| POST | `/api/invitations/send` | Send invitation emails |
| GET | `/api/invitations/:token` | Public RSVP page data |
| POST | `/api/invitations/:token/rsvp` | Submit RSVP |

Additional useful endpoints:
- `GET /api/events/:id/scan-tokens` — scanner token cache (protected)
- `POST /api/jobs/expire-reservations` — expire stale reservations
- `POST /api/uploads` — cover image upload (organizer/admin)

## Security & integrity notes

- **RBAC**: Organizer/Admin manage events; Scanner/Organizer/Admin can scan; guests cannot access other guests' data.
- **Validation**: all write endpoints validate input with Zod.
- **Overselling protection**: ticket reservation uses DB transactions and atomic ticket type seat increments; event capacity is also checked.
- **QR tokens**: generated with `crypto.randomBytes`, not ticket IDs.
- **Audit**: all check-in attempts are logged in `CheckinAttempt` (success and failure).
- **Payment adapter**: Stripe is implemented; M-Pesa stub lives at `src/lib/payments/mpesa.ts`.

## Tests

Basic check-in decision logic tests:

```bash
npm test
```

## Notes

- The Prisma schema uses PostgreSQL for enum/transaction support. For quick local setup, use the included `docker-compose.yml`.
- QR tokens are generated at reservation/create time and become valid for check-in only when ticket status is `PAID`.
- Cover image upload stores files in `public/uploads` for local MVP; use object storage (S3/R2/Cloudinary) in production.

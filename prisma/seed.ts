import { PrismaClient, Role, EventStatus, TicketStatus, RsvpStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

function token(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const organizer = await db.user.upsert({
    where: { email: "organizer@katasasa.test" },
    update: { name: "Olivia Organizer", role: Role.ORGANIZER, passwordHash },
    create: {
      email: "organizer@katasasa.test",
      name: "Olivia Organizer",
      role: Role.ORGANIZER,
      passwordHash,
    },
  });

  await db.user.upsert({
    where: { email: "scanner@katasasa.test" },
    update: { name: "Sam Scanner", role: Role.SCANNER, passwordHash },
    create: {
      email: "scanner@katasasa.test",
      name: "Sam Scanner",
      role: Role.SCANNER,
      passwordHash,
    },
  });

  await db.user.upsert({
    where: { email: "admin@katasasa.test" },
    update: { name: "Alex Admin", role: Role.ADMIN, passwordHash },
    create: {
      email: "admin@katasasa.test",
      name: "Alex Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const eventSlug = "dar-tech-summit-2026";
  const event = await db.event.upsert({
    where: { slug: eventSlug },
    update: {},
    create: {
      slug: eventSlug,
      title: "Dar Tech Summit 2026",
      description: "A unified showcase for builders, founders, and creators in Dar es Salaam.",
      startAt: new Date("2026-12-10T09:00:00.000Z"),
      endAt: new Date("2026-12-10T17:00:00.000Z"),
      venueName: "Julius Nyerere Convention Centre",
      venueAddress: "Shaaban Robert St, Dar es Salaam, Tanzania",
      timezone: "Africa/Dar_es_Salaam",
      capacity: 200,
      coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  // Clean existing seeded child records for idempotent local dev
  await db.checkinAttempt.deleteMany({ where: { eventId: event.id } });
  await db.checkin.deleteMany({ where: { eventId: event.id } });
  await db.invitation.deleteMany({ where: { eventId: event.id } });
  await db.ticket.deleteMany({ where: { eventId: event.id } });
  await db.ticketType.deleteMany({ where: { eventId: event.id } });

  const regular = await db.ticketType.create({
    data: {
      eventId: event.id,
      name: "Regular",
      price: 50000,
      currency: "TZS",
      quantity: 150,
      sold: 1,
    },
  });

  const vip = await db.ticketType.create({
    data: {
      eventId: event.id,
      name: "VIP",
      price: 120000,
      currency: "TZS",
      quantity: 50,
      sold: 0,
    },
  });

  const invitationType = await db.ticketType.create({
    data: {
      eventId: event.id,
      name: "Invitation",
      price: 0,
      currency: "TZS",
      quantity: 500,
      sold: 0,
      isInvitationType: true,
    },
  });

  const paidTicket = await db.ticket.create({
    data: {
      eventId: event.id,
      ticketTypeId: regular.id,
      holderName: "Grace Guest",
      holderEmail: "grace.guest@example.com",
      qrCode: token(),
      status: TicketStatus.PAID,
      paidAt: new Date(),
    },
  });

  await db.invitation.create({
    data: {
      eventId: event.id,
      guestName: "Ivan Invitee",
      guestEmail: "ivan.invitee@example.com",
      token: token(24),
      templateId: "elegant",
      rsvpStatus: RsvpStatus.PENDING,
    },
  });

  console.log("Seed complete:", {
    organizer: organizer.email,
    event: event.slug,
    ticketTypes: [regular.name, vip.name, invitationType.name],
    paidTicket: paidTicket.qrCode,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

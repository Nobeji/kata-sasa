import Stripe from "stripe";
import type { CheckoutSessionInput, PaymentAdapter } from "./index";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export class StripePaymentAdapter implements PaymentAdapter {
  async createCheckoutSession(input: CheckoutSessionInput) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: {
              name: `${input.eventTitle} — ${input.ticketTypeName}`,
            },
          },
        },
      ],
      metadata: {
        ticketId: input.ticketId,
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { id: session.id, url: session.url };
  }
}

export function getPaymentAdapter(): PaymentAdapter {
  // Pluggable: default Stripe. Add M-Pesa adapter selection here later.
  return new StripePaymentAdapter();
}

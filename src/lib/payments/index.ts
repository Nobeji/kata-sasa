export type CheckoutSessionInput = {
  ticketId: string;
  eventTitle: string;
  ticketTypeName: string;
  amount: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSessionResult = {
  id: string;
  url: string;
};

export interface PaymentAdapter {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
}

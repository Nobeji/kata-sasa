import type { CheckoutSessionInput, CheckoutSessionResult, PaymentAdapter } from "./index";

// Placeholder adapter for future M-Pesa integration.
// Implement createCheckoutSession to initiate STK push / payment request and return a redirect or payment URL.
export class MpesaPaymentAdapter implements PaymentAdapter {
  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    void _input;
    throw new Error("M-Pesa adapter not implemented yet");
  }
}

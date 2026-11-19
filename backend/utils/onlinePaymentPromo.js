export const ONLINE_PAYMENT_DISCOUNT_RS = 50;

export const calculateOnlinePaymentDiscount = (paymentMethod, amountAfterOtherDiscounts) => {
  if (paymentMethod !== 'razorpay') return 0;
  const base = Math.max(Number(amountAfterOtherDiscounts) || 0, 0);
  return Math.min(ONLINE_PAYMENT_DISCOUNT_RS, base);
};
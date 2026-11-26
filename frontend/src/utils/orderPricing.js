import { FIRST_PURCHASE_PROMO, ONLINE_PAYMENT_DISCOUNT_RS } from '@/config/promotions';

export const COD_ADVANCE_PERCENTAGE = 10;

/** Delivery fee by total quantity (1 → ₹399, 2 → ₹499, 3+ → ₹899). */
export const calculateDeliveryChargeByQuantity = (itemCount) => {
  const qty = Math.max(0, Math.floor(Number(itemCount) || 0));
  if (qty === 0) return 0;
  if (qty === 1) return 399;
  if (qty === 2) return 499;
  return 899;
};

export const calculateFirstPurchaseDiscount = (billAmount) => {
  if (!FIRST_PURCHASE_PROMO.enabled) return 0;
  const bill = Number(billAmount || 0);
  if (bill <= 0) return 0;
  return Math.min(
    Math.round(bill * (FIRST_PURCHASE_PROMO.discountPercent / 100)),
    FIRST_PURCHASE_PROMO.maxDiscountRs
  );
};

export const calculateOnlinePaymentDiscount = (paymentMethod, amountAfterOtherDiscounts) => {
  if (paymentMethod !== 'razorpay') return 0;
  const base = Math.max(Number(amountAfterOtherDiscounts) || 0, 0);
  return Math.min(ONLINE_PAYMENT_DISCOUNT_RS, base);
};

export const calculateOrderPricing = (
  itemsTotal,
  { firstPurchaseEligible = false, itemCount = 0, paymentMethod = 'cod', couponDiscount = 0 } = {},
) => {
  const items = Number(itemsTotal || 0);
  const deliveryCharge = calculateDeliveryChargeByQuantity(itemCount);
  const billBeforeDiscount = items + deliveryCharge;
  const normalizedCouponDiscount = Math.min(
    Math.max(Number(couponDiscount) || 0, 0),
    billBeforeDiscount,
  );
  const afterCoupon = Math.max(billBeforeDiscount - normalizedCouponDiscount, 0);
  const firstPurchaseDiscount = firstPurchaseEligible
    ? calculateFirstPurchaseDiscount(afterCoupon)
    : 0;
  const afterFirstPurchase = Math.max(afterCoupon - firstPurchaseDiscount, 0);
  const onlinePaymentDiscount = calculateOnlinePaymentDiscount(paymentMethod, afterFirstPurchase);
  const total = Math.max(afterFirstPurchase - onlinePaymentDiscount, 0);

  return {
    itemsTotal: items,
    deliveryCharge,
    billBeforeDiscount,
    couponDiscount: normalizedCouponDiscount,
    firstPurchaseDiscount,
    onlinePaymentDiscount,
    total,
  };
};
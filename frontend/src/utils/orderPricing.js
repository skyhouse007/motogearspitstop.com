import { FIRST_PURCHASE_PROMO } from '@/config/promotions';

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
  const bill = Number(billAmount || 0);
  if (bill <= 0) return 0;
  return Math.min(
    Math.round(bill * (FIRST_PURCHASE_PROMO.discountPercent / 100)),
    FIRST_PURCHASE_PROMO.maxDiscountRs
  );
};

export const calculateOrderPricing = (itemsTotal, { firstPurchaseEligible = false, itemCount = 0 } = {}) => {
  const items = Number(itemsTotal || 0);
  const deliveryCharge = calculateDeliveryChargeByQuantity(itemCount);
  const billBeforeDiscount = items + deliveryCharge;
  const firstPurchaseDiscount = firstPurchaseEligible
    ? calculateFirstPurchaseDiscount(billBeforeDiscount)
    : 0;
  const total = Math.max(billBeforeDiscount - firstPurchaseDiscount, 0);

  return {
    itemsTotal: items,
    deliveryCharge,
    billBeforeDiscount,
    firstPurchaseDiscount,
    total,
  };
};
import { FIRST_PURCHASE_PROMO, STORE_COUPONS } from '@/config/promotions';

export const normalizeCouponCode = (raw) => String(raw || '').trim().toUpperCase();

export const resolveCouponCode = (rawCode) => {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;

  const configured = STORE_COUPONS[code];
  if (configured?.enabled) {
    return { code, ...configured };
  }

  if (code === normalizeCouponCode(FIRST_PURCHASE_PROMO.couponCode) && FIRST_PURCHASE_PROMO.enabled) {
    return {
      code,
      percent: FIRST_PURCHASE_PROMO.discountPercent,
      maxRs: FIRST_PURCHASE_PROMO.maxDiscountRs,
      label: `${FIRST_PURCHASE_PROMO.discountPercent}% off`,
    };
  }

  return null;
};

export const calculateCouponDiscount = (coupon, billAmount) => {
  if (!coupon) return 0;
  const bill = Math.max(Number(billAmount) || 0, 0);
  if (bill <= 0) return 0;

  if (Number(coupon.flatRs) > 0) {
    return Math.min(Number(coupon.flatRs), bill);
  }

  if (Number(coupon.percent) > 0) {
    const maxRs = Number(coupon.maxRs) || bill;
    return Math.min(Math.round(bill * (Number(coupon.percent) / 100)), maxRs);
  }

  return 0;
};
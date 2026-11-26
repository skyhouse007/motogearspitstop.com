export const FIRST_PURCHASE_PROMO = {
  enabled: false,
  discountPercent: 10,
  maxDiscountRs: 500,
  couponCode: 'MGPWELCOME10',
};

/** Flat discount when customer pays the full order online (UPI / card / net banking). */
export const ONLINE_PAYMENT_DISCOUNT_RS = 50;

/** Checkout coupon codes (uppercase keys). */
export const STORE_COUPONS = {
  MOTOGEARS50: {
    enabled: true,
    flatRs: 50,
    label: 'Rs. 50 off',
  },
  MGPWELCOME10: {
    enabled: false,
    percent: 10,
    maxRs: 500,
    label: '10% off (max Rs. 500)',
  },
};

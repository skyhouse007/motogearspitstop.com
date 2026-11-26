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

const normalizeCouponCode = (raw) => String(raw || '').trim().toUpperCase();

export const resolveCouponCode = (rawCode) => {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;
  const configured = STORE_COUPONS[code];
  if (configured?.enabled) {
    return { code, ...configured };
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
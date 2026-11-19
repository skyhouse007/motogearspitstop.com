/** Delivery fee by total line-item quantity (sum of cart quantities). */
export const calculateDeliveryChargeByQuantity = (itemCount) => {
  const qty = Math.max(0, Math.floor(Number(itemCount) || 0));
  if (qty === 0) return 0;
  if (qty === 1) return 399;
  if (qty === 2) return 499;
  return 899;
};
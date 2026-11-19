const PINCODE_API = 'https://api.postalpincode.in/pincode';

export const normalizePincodeDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

export async function lookupPincode(pincode) {
  const pin = normalizePincodeDigits(pincode);
  if (pin.length !== 6) return null;

  try {
    const res = await fetch(`${PINCODE_API}/${pin}`);
    if (!res.ok) return { success: false };

    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    const offices = entry?.PostOffice;

    if (entry?.Status !== 'Success' || !Array.isArray(offices) || offices.length === 0) {
      return { success: false };
    }

    const office =
      offices.find((o) => o.DeliveryStatus === 'Delivery') ||
      offices[0];

    const city = String(office.District || office.Block || office.Name || '').trim();
    const state = String(office.State || '').trim();

    if (!city && !state) return { success: false };

    return { success: true, city, state };
  } catch {
    return { success: false };
  }
}
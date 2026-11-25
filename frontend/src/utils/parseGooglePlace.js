const findLongName = (components, ...types) => {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return '';
};

export function parseGooglePlace(place) {
  const components = place?.address_components;
  if (!Array.isArray(components) || components.length === 0) return null;

  const streetNumber = findLongName(components, 'street_number');
  const route = findLongName(components, 'route');
  const premise = findLongName(components, 'premise');
  const sublocality = findLongName(components, 'sublocality_level_1', 'sublocality');
  const subpremise = findLongName(components, 'subpremise');

  let addressLine1 = [streetNumber, route].filter(Boolean).join(' ').trim();
  if (!addressLine1) {
    addressLine1 = [premise, sublocality].filter(Boolean).join(', ').trim();
  }
  if (!addressLine1 && place?.formatted_address) {
    addressLine1 = place.formatted_address.split(',')[0]?.trim() || place.formatted_address;
  }

  const city = findLongName(
    components,
    'locality',
    'administrative_area_level_2',
    'administrative_area_level_3',
  );
  const state = findLongName(components, 'administrative_area_level_1');
  const pincode = findLongName(components, 'postal_code').replace(/\D/g, '').slice(0, 6);

  return {
    addressLine1,
    addressLine2: subpremise,
    city,
    state,
    pincode,
  };
}
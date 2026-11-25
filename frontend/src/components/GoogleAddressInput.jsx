import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { loadGoogleMaps } from '@/utils/loadGoogleMaps';
import { parseGooglePlace } from '@/utils/parseGooglePlace';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function GoogleAddressInput({
  value,
  onChange,
  onPlaceSelected,
  className = '',
  ...rest
}) {
  const inputRef = useRef(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    if (!MAPS_API_KEY || !inputRef.current) return;

    let autocomplete = null;
    let cancelled = false;

    loadGoogleMaps(MAPS_API_KEY)
      .then((google) => {
        if (cancelled || !google?.maps?.places || !inputRef.current) return;

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'formatted_address'],
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const parsed = parseGooglePlace(place);
          if (!parsed) return;

          if (parsed.addressLine1 && onChange) {
            onChange({
              target: { name: rest.name || 'addressLine1', value: parsed.addressLine1 },
            });
          }
          onPlaceSelectedRef.current?.(parsed);
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [onChange, rest.name]);

  return (
    <div className="relative">
      {MAPS_API_KEY ? (
        <MapPin
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      ) : null}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        autoComplete={MAPS_API_KEY ? 'off' : 'address-line1'}
        placeholder={MAPS_API_KEY ? 'Search your address on Google Maps' : undefined}
        className={`${MAPS_API_KEY ? 'pl-10 ' : ''}${className}`}
        {...rest}
      />
    </div>
  );
}
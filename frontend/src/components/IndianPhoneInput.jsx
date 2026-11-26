import { toIndianLocalDigits } from '@/utils/phoneUtils';

export default function IndianPhoneInput({
  value,
  onChange,
  id,
  disabled = false,
  containerClassName = '',
  prefixClassName = '',
  inputClassName = '',
}) {
  const local = toIndianLocalDigits(value);

  return (
    <div
      className={`flex overflow-hidden rounded-lg border focus-within:border-[#e63946] ${containerClassName}`}
    >
      <div
        className={`flex shrink-0 items-center border-r px-3 py-2.5 text-sm font-semibold text-[#0a0a0a] ${prefixClassName}`}
        aria-hidden
      >
        <span>+91</span>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        disabled={disabled}
        value={local}
        onChange={(e) => onChange(toIndianLocalDigits(e.target.value))}
        placeholder="9876543210"
        className={`min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 focus:outline-none ${inputClassName}`}
      />
    </div>
  );
}

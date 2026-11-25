// frontend/src/components/AuthModal.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '../store/authStore';
import IndianPhoneInput from '@/components/IndianPhoneInput';
import { toIndianLocalDigits } from '@/utils/phoneUtils';
import { trackMetaCompleteRegistration } from '@/utils/metaPixel';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [loginStep, setLoginStep] = useState('phone');
  const [registerStep, setRegisterStep] = useState('details');
  const [form, setForm] = useState({ name: '', phone: '', email: '', otp: '' });
  const [error, setError] = useState('');
  const [otpDelivery, setOtpDelivery] = useState('sms');
  const [devOtpHint, setDevOtpHint] = useState('');
  const { sendLoginOtp, verifyLoginOtp, sendRegisterOtp, verifyRegisterOtp, loading } = useAuthStore();

  const resetOtpFlow = () => {
    setLoginStep('phone');
    setRegisterStep('details');
    setOtpDelivery('sms');
    setDevOtpHint('');
    setForm((prev) => ({ ...prev, otp: '' }));
  };

  const applyOtpSendResult = (result) => {
    setOtpDelivery(result.delivery || 'sms');
    if (result.devOtp) {
      setDevOtpHint(String(result.devOtp));
      setForm((prev) => ({ ...prev, otp: String(result.devOtp) }));
    } else {
      setDevOtpHint('');
      setForm((prev) => ({ ...prev, otp: '' }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      resetOtpFlow();
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSendLoginOtp = async (event) => {
    event?.preventDefault();
    setError('');

    const phoneDigits = toIndianLocalDigits(form.phone);
    if (!phoneDigits) return setError('Phone number is required');
    if (phoneDigits.length < 10) {
      return setError('Please enter a valid 10-digit mobile number');
    }

    const result = await sendLoginOtp(phoneDigits);
    if (result.success) {
      applyOtpSendResult(result);
      setLoginStep('otp');
    } else {
      setError(result.message || 'Failed to send OTP');
    }
  };

  const handleResendLoginOtp = async () => {
    setError('');
    const phoneDigits = toIndianLocalDigits(form.phone);
    const result = await sendLoginOtp(phoneDigits);
    if (result.success) {
      applyOtpSendResult(result);
    } else {
      setError(result.message || 'Failed to resend OTP');
    }
  };

  const handleVerifyLoginOtp = async (event) => {
    event?.preventDefault();
    setError('');

    const phoneDigits = toIndianLocalDigits(form.phone);
    const otp = String(form.otp || '').replace(/\D/g, '');
    if (otp.length !== 6) return setError('Please enter the 6-digit OTP');

    const result = await verifyLoginOtp({ phone: phoneDigits, otp });
    if (result.success) {
      await onSuccess?.();
      onClose();
    } else {
      setError(result.message || 'Invalid OTP');
    }
  };

  const validateRegisterDetails = () => {
    if (!form.name.trim()) return 'Full name is required';

    const phoneDigits = toIndianLocalDigits(form.phone);
    if (!phoneDigits) return 'Phone number is required';
    if (phoneDigits.length < 10) {
      return 'Please enter a valid 10-digit mobile number';
    }

    const email = form.email.trim();
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const handleRegisterSendOtp = async (event) => {
    event?.preventDefault();
    setError('');

    const validationError = validateRegisterDetails();
    if (validationError) return setError(validationError);

    const phoneDigits = toIndianLocalDigits(form.phone);
    const email = form.email.trim();

    const result = await sendRegisterOtp({
      name: form.name.trim(),
      phone: phoneDigits,
      email,
    });

    if (result.success) {
      applyOtpSendResult(result);
      setRegisterStep('otp');
    } else {
      setError(result.message || 'Failed to send OTP');
    }
  };

  const handleResendRegisterOtp = async () => {
    setError('');
    const validationError = validateRegisterDetails();
    if (validationError) return setError(validationError);

    const phoneDigits = toIndianLocalDigits(form.phone);
    const result = await sendRegisterOtp({
      name: form.name.trim(),
      phone: phoneDigits,
      email: form.email.trim(),
    });
    if (result.success) {
      applyOtpSendResult(result);
    } else {
      setError(result.message || 'Failed to resend OTP');
    }
  };

  const handleRegisterVerifyOtp = async (event) => {
    event?.preventDefault();
    setError('');

    const validationError = validateRegisterDetails();
    if (validationError) return setError(validationError);

    const otp = String(form.otp || '').replace(/\D/g, '');
    if (otp.length !== 6) return setError('Please enter the 6-digit OTP');

    const phoneDigits = toIndianLocalDigits(form.phone);
    const email = form.email.trim();

    const result = await verifyRegisterOtp({
      name: form.name.trim(),
      phone: phoneDigits,
      email,
      otp,
    });

    if (result.success) {
      const nameParts = form.name.trim().split(/\s+/);
      trackMetaCompleteRegistration({
        email,
        phone: phoneDigits,
        firstName: nameParts[0],
        lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined,
      });
      await onSuccess?.();
      onClose();
    } else {
      setError(result.message || 'Something went wrong');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[#0a0a0a]/15 bg-white/90 px-3 py-2.5 text-[#0a0a0a] placeholder:text-gray-500 focus:border-[#e63946] focus:outline-none';

  const loginOnSubmit = loginStep === 'phone' ? handleSendLoginOtp : handleVerifyLoginOtp;
  const registerOnSubmit = registerStep === 'details' ? handleRegisterSendOtp : handleRegisterVerifyOtp;

  const otpBlock = (onChangeNumber, onResend) => (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Enter OTP *</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className={`${inputClass} tracking-[0.35em] text-center font-semibold`}
        value={form.otp}
        onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
        placeholder="000000"
      />
      <p className="mt-1.5 text-xs text-[#0a0a0a]/65">
        {otpDelivery === 'sms'
          ? 'We sent a 6-digit code to your mobile number.'
          : 'SMS is not set up yet. Use the test code below (also in the backend terminal).'}
      </p>
      {devOtpHint && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xl font-bold tracking-[0.35em] text-[#0a0a0a]">
          {devOtpHint}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="text-sm font-medium text-[#0a0a0a] underline transition hover:text-[#e63946] disabled:opacity-50"
        >
          Resend OTP
        </button>
        <button
          type="button"
          onClick={onChangeNumber}
          className="text-sm font-medium text-[#0a0a0a] underline transition hover:text-[#e63946]"
        >
          Change number
        </button>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 px-4 py-4">
      <button
        type="button"
        aria-label="Close login modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <form
        onSubmit={mode === 'login' ? loginOnSubmit : registerOnSubmit}
        autoComplete="off"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-xl font-bold text-[#0a0a0a] transition hover:text-[#e63946]"
          aria-label="Close"
        >
          x
        </button>

        <h2 className="mb-4 pr-8 text-xl font-bold text-[#0a0a0a] sm:text-2xl">
          {mode === 'login' ? 'Login' : 'Create Account'}
        </h2>

        {error && <p className="mb-3 text-sm font-medium text-[#e63946]">{error}</p>}

        {mode === 'login' && (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Phone Number *</label>
              <IndianPhoneInput
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                disabled={loginStep === 'otp'}
                containerClassName="border-[#0a0a0a]/15 bg-white/90"
                prefixClassName="border-[#0a0a0a]/15 bg-[#F7F7F5]"
                inputClassName="text-[#0a0a0a] placeholder:text-gray-500"
              />
            </div>

            {loginStep === 'otp' &&
              otpBlock(
                () => {
                  setLoginStep('phone');
                  setDevOtpHint('');
                  setForm({ ...form, otp: '' });
                  setError('');
                },
                handleResendLoginOtp
              )}

            <button
              type="submit"
              disabled={loading}
              className="mb-3 w-full rounded-full bg-[#e63946] py-2.5 text-sm font-bold text-white transition hover:bg-[#c1121f] disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : loginStep === 'phone'
                  ? 'SEND OTP'
                  : 'VERIFY & LOG IN'}
            </button>
          </>
        )}

        {mode === 'register' && (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Full Name *</label>
              <input
                autoComplete="name"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                disabled={registerStep === 'otp'}
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Phone Number *</label>
              <IndianPhoneInput
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                disabled={registerStep === 'otp'}
                containerClassName="border-[#0a0a0a]/15 bg-white/90"
                prefixClassName="border-[#0a0a0a]/15 bg-[#F7F7F5]"
                inputClassName="text-[#0a0a0a] placeholder:text-gray-500"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Email Address *</label>
              <input
                type="email"
                autoComplete="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                disabled={registerStep === 'otp'}
              />
            </div>

            {registerStep === 'otp' &&
              otpBlock(
                () => {
                  setRegisterStep('details');
                  setDevOtpHint('');
                  setForm({ ...form, otp: '' });
                  setError('');
                },
                handleResendRegisterOtp
              )}

            <button
              type="submit"
              disabled={loading}
              className="mb-3 w-full rounded-full bg-[#e63946] py-2.5 text-sm font-bold text-white transition hover:bg-[#c1121f] disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : registerStep === 'details'
                  ? 'CREATE ACCOUNT'
                  : 'VERIFY & CREATE ACCOUNT'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            resetOtpFlow();
          }}
          className="w-full py-1 text-center text-sm font-medium text-[#0a0a0a]/75 transition-colors hover:text-[#e63946]"
        >
          {mode === 'login' ? 'Create account' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>,
    document.body
  );
}
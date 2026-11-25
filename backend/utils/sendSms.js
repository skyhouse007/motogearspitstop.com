import axios from 'axios';

const fast2smsHeaders = (apiKey) => ({
  authorization: apiKey,
  'Content-Type': 'application/json',
});

const logDevOtp = (phone, otp, reason) => {
  if (reason) {
    console.warn(`[dev] Fast2SMS unavailable (${reason}). OTP logged for testing.`);
  }
  console.log(`[dev] OTP for ${phone}: ${otp}`);
};

const useDevFallback = () => {
  if (process.env.FAST2SMS_DEV_FALLBACK === 'false') return false;
  return process.env.NODE_ENV !== 'production';
};

const assertFast2SmsOk = (data) => {
  if (data?.return === true) return;
  const message =
    (Array.isArray(data?.message) ? data.message[0] : data?.message) ||
  data?.status_code ? `Fast2SMS error (${data.status_code})` : 'Failed to send OTP SMS';
  const err = new Error(message);
  err.fast2sms = data;
  throw err;
};

const isSmartOtpTemplateId = (otpId) => /^[a-zA-Z0-9_-]{6,64}$/.test(otpId);

const sendViaSmartOtp = async ({ apiKey, phone, otp, otpId }) => {
  const { data } = await axios.post(
    'https://www.fast2sms.com/dev/otp/send',
    {
      mobile: phone,
      otp_id: otpId,
      otp: String(otp),
      otp_expiry: 10,
      otp_length: 6,
    },
    { headers: fast2smsHeaders(apiKey), timeout: 15000, validateStatus: () => true }
  );
  assertFast2SmsOk(data);
};

const sendViaDlt = async ({ apiKey, phone, otp, senderId, messageId }) => {
  const { data } = await axios.post(
    'https://www.fast2sms.com/dev/bulkV2',
    {
      route: 'dlt',
      sender_id: senderId,
      message: messageId,
      variables_values: String(otp),
      numbers: phone,
    },
    { headers: fast2smsHeaders(apiKey), timeout: 15000 }
  );
  assertFast2SmsOk(data);
};

const sendSmsOtp = async ({ phone, otp }) => {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  const otpId = process.env.FAST2SMS_OTP_ID?.trim();
  const senderId = process.env.FAST2SMS_SENDER_ID?.trim();
  const dltMessageId = process.env.FAST2SMS_DLT_MESSAGE_ID?.trim();

  if (!apiKey) {
    if (useDevFallback()) {
      logDevOtp(phone, otp, 'FAST2SMS_API_KEY not set');
      return { channel: 'console' };
    }
    throw new Error('SMS service is not configured');
  }

  try {
    if (otpId) {
      if (!isSmartOtpTemplateId(otpId)) {
        const err = new Error(
          'FAST2SMS_OTP_ID is not valid. Copy the OTP ID from Fast2SMS → Smart OTP (not the API key or DLT Message ID).'
        );
        throw err;
      }
      await sendViaSmartOtp({ apiKey, phone, otp, otpId });
      return { channel: 'sms' };
    }

    if (senderId && dltMessageId) {
      await sendViaDlt({ apiKey, phone, otp, senderId, messageId: dltMessageId });
      return { channel: 'sms' };
    }

    const err = new Error(
      'Set FAST2SMS_OTP_ID (Smart OTP) or FAST2SMS_SENDER_ID + FAST2SMS_DLT_MESSAGE_ID (DLT) in backend .env'
    );
    throw err;
  } catch (error) {
    const reason = error.response?.data?.message || error.message;

    if (useDevFallback()) {
      logDevOtp(phone, otp, reason);
      return { channel: 'console' };
    }

    throw new Error(
      typeof reason === 'string' ? reason : 'Failed to send OTP SMS'
    );
  }
};

export default sendSmsOtp;
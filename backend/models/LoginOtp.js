import mongoose from 'mongoose';

const loginOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: { type: String, enum: ['login', 'register'], default: 'login', index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

loginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LoginOtp = mongoose.model('LoginOtp', loginOtpSchema);
export default LoginOtp;
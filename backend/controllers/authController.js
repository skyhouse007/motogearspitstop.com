//controllers/authController.js

import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import LoginOtp from '../models/LoginOtp.js';
import generateToken, { cookieOptions } from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import sendSmsOtp from '../utils/sendSms.js';

const PRODUCTION_FRONTEND_URL = 'https://motogearspitstop.com';

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

const normalizeUrl = url => url?.trim().replace(/\/$/, '');

const getFrontendUrl = (req) => {
  const requestOrigin = normalizeUrl(req.get('origin'));
  const configuredUrl = normalizeUrl(process.env.FRONTEND_URL);

  if (requestOrigin && !requestOrigin.includes('motogearspitstop.onrender.com')) {
    return requestOrigin;
  }

  if (configuredUrl && !configuredUrl.includes('motogearspitstop.onrender.com')) {
    return configuredUrl;
  }

  return PRODUCTION_FRONTEND_URL;
};

// @POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const phoneDigits = normalizePhone(phone);

  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!name || !phone || !normalizedEmail) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  if (phoneDigits.length < 10) {
    res.status(400);
    throw new Error('Please enter a valid phone number');
  }

  const password =
    String(req.body.password || '').trim() ||
    crypto.randomBytes(24).toString('base64url');

  const phoneExists = await User.findOne({ phone: phoneDigits });
  if (phoneExists) {
    res.status(400);
    throw new Error('Phone number already registered');
  }

  const emailExists = await User.findOne({ email: normalizedEmail });
  if (emailExists) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const user = await User.create({
    name,
    password,
    phone: phoneDigits,
    email: normalizedEmail,
  });
  const token = generateToken(res, user._id);

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    },
    token
  });
});

const getAdminCredentials = () => ({
  name: String(process.env.ADMIN_NAME || 'admin').trim().toLowerCase(),
  password: String(process.env.ADMIN_PASSWORD || 'motogears123'),
});

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const sendAuthUser = (res, user) => {
  const token = generateToken(res, user._id);

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    },
    token
  });
};

// @POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body;
  const phoneDigits = normalizePhone(phone);
  const admin = getAdminCredentials();

  if (!phoneDigits && String(name || '').trim().toLowerCase() === admin.name) {
    if (!password || !safeEqual(password, admin.password)) {
      res.status(401);
      throw new Error('Invalid admin name or password');
    }

    let adminUser = await User.findOne({ role: 'admin', name: admin.name });
    if (!adminUser) {
      adminUser = new User({ name: admin.name, password: admin.password, role: 'admin' });
      // phone is unique+sparse, so leave it unset instead of the '' default
      adminUser.set('phone', undefined);
      await adminUser.save();
    }

    return sendAuthUser(res, adminUser);
  }

  if (!name?.trim() || !phoneDigits || !password) {
    res.status(400);
    throw new Error('Please enter your name, phone number, and password');
  }

  if (phoneDigits.length < 10) {
    res.status(400);
    throw new Error('Please enter a valid phone number');
  }

  const user = await User.findOne({ phone: phoneDigits });
  const nameMatches =
    user &&
    user.name.trim().toLowerCase() === String(name).trim().toLowerCase();

  if (!user || !nameMatches || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid name, phone number, or password');
  }

  sendAuthUser(res, user);
});

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const generateSixDigitOtp = () => String(crypto.randomInt(100000, 1000000));

const sendOtpForPurpose = async ({ phoneDigits, purpose, logLabel }) => {
  const recentOtp = await LoginOtp.findOne({ phone: phoneDigits, purpose }).sort({ createdAt: -1 });
  if (recentOtp && Date.now() - recentOtp.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const err = new Error('Please wait a minute before requesting another OTP');
    err.statusCode = 429;
    throw err;
  }

  const otp = generateSixDigitOtp();
  await LoginOtp.deleteMany({ phone: phoneDigits, purpose });
  await LoginOtp.create({
    phone: phoneDigits,
    purpose,
    otpHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  try {
    const delivery = await sendSmsOtp({ phone: phoneDigits, otp });
    return { delivery, otp };
  } catch (error) {
    await LoginOtp.deleteMany({ phone: phoneDigits, purpose });
    console.error(`${logLabel} OTP SMS failed:`, error.message);
    const err = new Error('Unable to send OTP right now. Please try again in a few minutes.');
    err.statusCode = 503;
    throw err;
  }
};

const buildSendOtpResponse = (res, { delivery, otp }) => {
  const viaSms = delivery?.channel === 'sms';
  const payload = {
    success: true,
    delivery: delivery?.channel || 'sms',
    message: viaSms
      ? 'OTP sent to your mobile number'
      : 'SMS is not configured yet. Use the code shown below (local testing only).',
  };

  if (process.env.NODE_ENV !== 'production' && !viaSms) {
    payload.devOtp = otp;
  }

  res.json(payload);
};

const verifyOtpForPurpose = async (phoneDigits, otp, purpose) => {
  const record = await LoginOtp.findOne({ phone: phoneDigits, purpose }).sort({ createdAt: -1 });
  if (!record || record.expiresAt.getTime() < Date.now() || record.otpHash !== hashOtp(otp)) {
    return false;
  }
  await LoginOtp.deleteMany({ phone: phoneDigits, purpose });
  return true;
};

// @POST /api/auth/login/send-otp
export const sendLoginOtp = asyncHandler(async (req, res) => {
  const phoneDigits = normalizePhone(req.body.phone);

  if (!phoneDigits || phoneDigits.length < 10) {
    res.status(400);
    throw new Error('Please enter a valid 10-digit mobile number');
  }

  const user = await User.findOne({ phone: phoneDigits });
  if (!user) {
    res.status(404);
    throw new Error('No account with this phone number. Please create an account.');
  }

  let issued;
  try {
    issued = await sendOtpForPurpose({ phoneDigits, purpose: 'login', logLabel: 'Login' });
  } catch (error) {
    res.status(error.statusCode || 500);
    throw error;
  }

  buildSendOtpResponse(res, issued);
});

// @POST /api/auth/login/verify-otp
export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const phoneDigits = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || '').replace(/\D/g, '');

  if (!phoneDigits || phoneDigits.length < 10) {
    res.status(400);
    throw new Error('Please enter a valid phone number');
  }

  if (otp.length !== 6) {
    res.status(400);
    throw new Error('Please enter the 6-digit OTP');
  }

  const valid = await verifyOtpForPurpose(phoneDigits, otp, 'login');
  if (!valid) {
    res.status(401);
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOne({ phone: phoneDigits });
  if (!user) {
    res.status(404);
    throw new Error('No account with this phone number');
  }

  sendAuthUser(res, user);
});

// @POST /api/auth/register/send-otp
export const sendRegisterOtp = asyncHandler(async (req, res) => {
  const phoneDigits = normalizePhone(req.body.phone);
  const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();

  if (!name || !normalizedEmail) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  if (!phoneDigits || phoneDigits.length < 10) {
    res.status(400);
    throw new Error('Please enter a valid 10-digit mobile number');
  }

  if (await User.findOne({ phone: phoneDigits })) {
    res.status(400);
    throw new Error('Phone number already registered');
  }

  if (await User.findOne({ email: normalizedEmail })) {
    res.status(400);
    throw new Error('Email already registered');
  }

  let issued;
  try {
    issued = await sendOtpForPurpose({ phoneDigits, purpose: 'register', logLabel: 'Register' });
  } catch (error) {
    res.status(error.statusCode || 500);
    throw error;
  }

  buildSendOtpResponse(res, issued);
});

// @POST /api/auth/register/verify-otp
export const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const phoneDigits = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || '').replace(/\D/g, '');
  const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();

  if (!name || !normalizedEmail) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  if (!phoneDigits || phoneDigits.length < 10) {
    res.status(400);
    throw new Error('Please enter a valid phone number');
  }

  if (otp.length !== 6) {
    res.status(400);
    throw new Error('Please enter the 6-digit OTP');
  }

  const valid = await verifyOtpForPurpose(phoneDigits, otp, 'register');
  if (!valid) {
    res.status(401);
    throw new Error('Invalid or expired OTP');
  }

  if (await User.findOne({ phone: phoneDigits })) {
    res.status(400);
    throw new Error('Phone number already registered');
  }

  if (await User.findOne({ email: normalizedEmail })) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const password = crypto.randomBytes(24).toString('base64url');
  const user = await User.create({
    name,
    password,
    phone: phoneDigits,
    email: normalizedEmail,
  });

  const token = generateToken(res, user._id);

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
    },
    token,
  });
});

// @POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    ...cookieOptions,
    expires: new Date(0)
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// @GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, user });
});

// @POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email) {
    res.status(400);
    throw new Error('Please enter your email');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('No account with that email');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
  await user.save();
const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'MotoGear Pitstop - Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. Valid for 15 minutes.</p>
        <a href="${resetUrl}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;">Reset Password</a>
        <p>If you didn't request this, ignore this email.</p>
      `
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    console.error('Forgot password email failed:', error.message);
    res.status(503);
    throw new Error('Unable to send reset email right now. Please try again in a few minutes.');
  }

  res.json({ success: true, message: 'Reset email sent' });
});

// @PUT /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const { password } = req.body;

  if (!password || password.length < 6 || !/[a-z]/.test(password)) {
    res.status(400);
    throw new Error('Password must be at least 6 characters and include one lowercase letter');
  }

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = generateToken(res, user._id);
  res.json({ success: true, message: 'Password reset successful', token });
});

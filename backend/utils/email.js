const nodemailer = require("nodemailer");

function createTransport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4, // Force IPv4 to prevent IPv6 DNS lookup delays on Render/cloud environments
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10 seconds connection timeout
    greetingTimeout: 10000,   // 10 seconds greeting timeout
    socketTimeout: 15000,     // 15 seconds socket timeout
  });
}

const baseStyle = `
  font-family:'Segoe UI',system-ui,sans-serif;
  max-width:500px;margin:0 auto;
  background:#0d0d1a;color:#e8e8f0;border-radius:14px;overflow:hidden;
`;

const headerStyle = `
  background:linear-gradient(135deg,#4f46e5,#7c3aed);
  padding:28px 32px;
`;

const bodyStyle = `padding:32px;`;

function otpBlock(otp) {
  return `
    <div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:10px;
                padding:24px;text-align:center;margin:24px 0">
      <p style="margin:0 0 8px;font-size:11px;color:#8b5cf6;
                letter-spacing:.1em;text-transform:uppercase">Your OTP</p>
      <p style="margin:0;font-size:42px;font-weight:700;
                letter-spacing:14px;color:#fff;font-family:monospace">${otp}</p>
    </div>
  `;
}

/**
 * Send email verification OTP
 */
async function sendVerificationEmail(toEmail, name, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  EMAIL not configured — OTP:", otp, "(logged for dev)");
    return;
  }

  try {
    const transport = createTransport();
    // Non-blocking asynchronous dispatch so HTTP response is returned immediately to the frontend
    transport.sendMail({
      from: `"DevMate AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "DevMate AI — Verify Your Email",
      html: `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin:0;font-size:20px;color:white">DevMate AI</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px">Email Verification</p>
          </div>
          <div style="${bodyStyle}">
            <h2 style="margin:0 0 10px;color:#e8e8f0">Hi ${name} 👋</h2>
            <p style="color:#9ca3af;line-height:1.6">
              Welcome to DevMate AI! Please verify your email address using the OTP below.
              It expires in <strong style="color:#e8e8f0">10 minutes</strong>.
            </p>
            ${otpBlock(otp)}
            <p style="color:#6b7280;font-size:13px">
              If you didn't create a DevMate AI account, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    }).then((info) => {
      console.log("✅ Verification email sent successfully to", toEmail, ":", info.messageId);
    }).catch((err) => {
      console.error("❌ Failed to send verification email (non-fatal):", err.message);
    });
  } catch (err) {
    console.error("❌ Error initializing email transport:", err.message);
  }
}

/**
 * Send password reset OTP
 */
async function sendPasswordResetEmail(toEmail, name, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  EMAIL not configured — Reset OTP:", otp, "(logged for dev)");
    return;
  }

  try {
    const transport = createTransport();
    // Non-blocking asynchronous dispatch so HTTP response is returned immediately to the frontend
    transport.sendMail({
      from: `"DevMate AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "DevMate AI — Password Reset OTP",
      html: `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin:0;font-size:20px;color:white">DevMate AI</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px">Password Reset</p>
          </div>
          <div style="${bodyStyle}">
            <h2 style="margin:0 0 10px;color:#e8e8f0">Hi ${name},</h2>
            <p style="color:#9ca3af;line-height:1.6">
              We received a request to reset your password. Use the OTP below.
              It expires in <strong style="color:#e8e8f0">10 minutes</strong>.
            </p>
            ${otpBlock(otp)}
            <p style="color:#6b7280;font-size:13px">
              If you didn't request a password reset, your account is safe — just ignore this email.
            </p>
          </div>
        </div>
      `,
    }).then((info) => {
      console.log("✅ Password reset email sent successfully to", toEmail, ":", info.messageId);
    }).catch((err) => {
      console.error("❌ Failed to send password reset email (non-fatal):", err.message);
    });
  } catch (err) {
    console.error("❌ Error initializing email transport:", err.message);
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };


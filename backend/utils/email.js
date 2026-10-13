const nodemailer = require("nodemailer");

function createTransport() {
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4, // Force IPv4 to prevent IPv6 DNS lookup delays on Render/cloud environments
    auth: {
      user: process.env.EMAIL_USER,
      pass: pass,
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
 * Multi-provider email dispatcher:
 * 1. Brevo REST API (HTTPS port 443 - free, allows any recipient, never blocked by Render)
 * 2. Resend REST API (HTTPS port 443 - never blocked by Render)
 * 3. Nodemailer Gmail SMTP (works on Localhost / networks where ports 465/587 are open)
 */
async function dispatchEmail({ toEmail, name, subject, text, html }) {
  // Option 1: Brevo HTTPS REST API (Port 443)
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY.trim(),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "DevMate AI",
            email: process.env.EMAIL_USER || "sandeepgaud8081@gmail.com",
          },
          to: [{ email: toEmail, name: name || "User" }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log("✅ Email sent via Brevo HTTPS API:", data.messageId);
        return;
      }
      console.error("❌ Brevo API error:", data);
    } catch (err) {
      console.error("❌ Brevo request failed:", err.message);
    }
  }

  // Option 2: Resend HTTPS REST API (Port 443)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "DevMate AI <onboarding@resend.dev>",
          to: [toEmail],
          subject,
          html,
          text,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log("✅ Email sent via Resend HTTPS API:", data.id);
        return;
      }
      console.error("❌ Resend API error:", data);
    } catch (err) {
      console.error("❌ Resend request failed:", err.message);
    }
  }

  // Option 3: Nodemailer Gmail SMTP (for Localhost / open port environments)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  EMAIL credentials not configured.");
    return;
  }

  try {
    const transport = createTransport();
    transport.sendMail({
      from: `"DevMate AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text,
      html,
    }).then((info) => {
      console.log("✅ Email sent via Nodemailer to", toEmail, ":", info.messageId);
    }).catch((err) => {
      console.error("❌ Failed to send email via Nodemailer:", err.message);
    });
  } catch (err) {
    console.error("❌ Error initializing Nodemailer transport:", err.message);
  }
}

/**
 * Send email verification OTP
 */
async function sendVerificationEmail(toEmail, name, otp) {
  const subject = "DevMate AI — Verify Your Email";
  const text = `Hi ${name},\n\nYour DevMate AI email verification OTP is: ${otp}\n\nThis OTP expires in 10 minutes.\nIf you didn't request this, please ignore this email.`;
  const html = `
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
  `;

  await dispatchEmail({ toEmail, name, subject, text, html });
}

/**
 * Send password reset OTP
 */
async function sendPasswordResetEmail(toEmail, name, otp) {
  const subject = "DevMate AI — Password Reset OTP";
  const text = `Hi ${name},\n\nYour DevMate AI password reset OTP is: ${otp}\n\nThis OTP expires in 10 minutes.\nIf you didn't request a password reset, please ignore this email.`;
  const html = `
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
  `;

  await dispatchEmail({ toEmail, name, subject, text, html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };


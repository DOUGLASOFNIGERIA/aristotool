import nodemailer from 'nodemailer'

const gmailUser = process.env.GMAIL_USER
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
const fromEmail = process.env.FROM_EMAIL || 'Aristool <no-reply@aristotool.dev>'
const otpTtlMinutes = Number(process.env.OTP_TTL_MINUTES) || 10

let transporter

function getTransporter() {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Email delivery is not configured. Ask the site owner to set GMAIL_USER and GMAIL_APP_PASSWORD.')
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailAppPassword },
    })
  }
  return transporter
}

export function isEmailConfigured() {
  return Boolean(gmailUser && gmailAppPassword)
}

export async function sendOtpEmail(email, code) {
  const message = {
    from: fromEmail,
    to: email,
    subject: 'Your Aristool verification code',
    text: `Your Aristool verification code is ${code}. It expires in ${otpTtlMinutes} minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">
        <h2>Verify your Aristool account</h2>
        <p>Use this one-time code to finish creating your account:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${code}</p>
        <p>This code expires in ${otpTtlMinutes} minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  }
  await getTransporter().sendMail(message)
}

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL;
const FROM = process.env.FROM_EMAIL;

// 1. Token delivery to student
async function sendTokenEmail(student_email, token_uuid) {
  const claimUrl = `${BASE_URL}/claim?token=${token_uuid}`;
  await resend.emails.send({
    from: FROM,
    to: student_email,
    subject: 'Your free laptop claim link — MCG Career College',
    html: `
      <p>Hi there,</p>
      <p>Congratulations on your enrollment at MCG Career College! As part of your program, you are eligible to claim a <strong>free laptop (up to $500 value)</strong>.</p>
      <p><a href="${claimUrl}" style="background:#1A1A1A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Claim Your Laptop →</a></p>
      <p>This link is unique to you and expires in <strong>30 days</strong>. Do not share it.</p>
      <p>Questions? Contact <a href="mailto:admissions@mcgcc.ca">admissions@mcgcc.ca</a></p>
      <p>— MCG Career College</p>
    `
  });
}

// 2. Confirmation to student after submission
async function sendClaimConfirmationToStudent(student_email, student_name, claim_id, laptop) {
  const statusUrl = `${BASE_URL}/status?claim=${claim_id}`;
  await resend.emails.send({
    from: FROM,
    to: student_email,
    subject: 'Your laptop claim has been received',
    html: `
      <p>Hi ${student_name},</p>
      <p>We received your laptop claim request for the <strong>${laptop.name}</strong> ($${laptop.price_cad}).</p>
      <p>Our finance team will verify your funding status and respond within <strong>2–3 business days</strong>.</p>
      <p><a href="${statusUrl}">Check your claim status →</a></p>
      <p>— MCG Career College</p>
    `
  });
}

// 3. Notification to finance team
async function sendClaimNotificationToFinance(claim, laptop) {
  const reviewUrl = `${BASE_URL}/admin/claims/${claim.id}`;
  await resend.emails.send({
    from: FROM,
    to: process.env.FINANCE_EMAIL,
    subject: `New laptop claim — ${claim.student_name}`,
    html: `
      <p>A new laptop claim has been submitted and requires review.</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <tr><td style="padding:6px 0;color:#666;">Student</td><td><strong>${claim.student_name}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Email</td><td>${claim.student_email}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student ID</td><td>${claim.student_id_number || 'N/A'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Laptop</td><td>${laptop.name} — $${laptop.price_cad}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Submitted</td><td>${new Date().toLocaleString('en-CA')}</td></tr>
      </table>
      <p><a href="${reviewUrl}" style="background:#1A1A1A;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">Review Claim →</a></p>
    `
  });
}

// 4. Approval email to student + OpenBox notification
async function sendApprovalEmail(claim, laptop) {
  // Student email
  await resend.emails.send({
    from: FROM,
    to: claim.student_email,
    subject: 'Your laptop claim is approved!',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Great news — your laptop claim has been <strong>approved</strong>!</p>
      <p>You selected: <strong>${laptop.name}</strong></p>
      <p>OpenBox will reach out shortly with a form to collect your shipping details. Watch for an email from them.</p>
      <p>— MCG Career College</p>
    `
  });

  // OpenBox notification
  await resend.emails.send({
    from: FROM,
    to: process.env.OPENBOX_EMAIL,
    subject: `New approved laptop order — Claim #${claim.id}`,
    html: `
      <p>A laptop claim has been approved. Please process this order.</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <tr><td style="padding:6px 0;color:#666;">Claim ID</td><td><strong>#${claim.id}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student Name</td><td>${claim.student_name}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student Email</td><td>${claim.student_email}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student Phone</td><td>${claim.student_phone || 'N/A'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Laptop</td><td>${laptop.name} (${laptop.brand} ${laptop.model})</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Specs</td><td>${laptop.specs || 'N/A'}</td></tr>
      </table>
      <p>Log into the vendor portal to send the student a shipping details form and update fulfillment status.</p>
      <p><a href="${process.env.BASE_URL}/vendor">Open Vendor Portal →</a></p>
    `
  });
}

// 5. Denial email to student
async function sendDenialEmail(claim, reason) {
  await resend.emails.send({
    from: FROM,
    to: claim.student_email,
    subject: 'Update on your laptop claim',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Unfortunately, your laptop claim could not be approved at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you believe this is an error or have questions, please contact your admissions advisor or email <a href="mailto:admissions@mcgcc.ca">admissions@mcgcc.ca</a>.</p>
      <p>— MCG Career College</p>
    `
  });
}

// 6. Shipping form link to student (from vendor)
async function sendShippingFormEmail(claim) {
  const shippingUrl = `${process.env.BASE_URL}/shipping?claim=${claim.id}&token=${claim.token_uuid}`;
  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: claim.student_email,
    subject: 'Action required — submit your shipping address',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Your laptop is ready to ship! Please provide your shipping address using the link below.</p>
      <p><a href="${shippingUrl}" style="background:#1A1A1A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Submit Shipping Address →</a></p>
      <p>Please complete this within <strong>5 business days</strong> to avoid delays.</p>
      <p>— OpenBox / MCG Career College</p>
    `
  });
}

// 7. Tracking number to student
async function sendTrackingEmail(claim) {
  await resend.emails.send({
    from: FROM,
    to: claim.student_email,
    subject: 'Your laptop is on its way!',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Your laptop has been shipped!</p>
      <p><strong>Carrier:</strong> ${claim.carrier}<br/>
         <strong>Tracking #:</strong> ${claim.tracking_number}</p>
      <p>You can track your shipment on the carrier's website using the tracking number above.</p>
      <p>— MCG Career College</p>
    `
  });
}

module.exports = {
  sendTokenEmail,
  sendClaimConfirmationToStudent,
  sendClaimNotificationToFinance,
  sendApprovalEmail,
  sendDenialEmail,
  sendShippingFormEmail,
  sendTrackingEmail
};

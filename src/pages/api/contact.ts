import type { APIRoute } from 'astro';

export const prerender = false; // Disable pre-rendering for this API route to run dynamically at request time

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { name, email, phone, service, message } = data;

    // 1. Basic Validation
    if (!name || !email || !service || !message) {
      return new Response(JSON.stringify({ error: 'Please fill out all required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Environment Variable Retrieval
    // Prioritizes: Cloudflare Worker Runtime Env -> Astro Build Env -> Hardcoded Fallback
    const cfEnv = (locals as any)?.runtime?.env;
    const apiKey = cfEnv?.RESEND_API_KEY || 
                   import.meta.env.RESEND_API_KEY || 
                   're_AuoRvXCd_M9c9AJwpbUozthKWZM5xTQX1';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Resend API configuration key is missing.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. HTML Email Body Assembly
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid rgba(0, 181, 226, 0.2); border-radius: 8px; background-color: #070b19; color: #f4f6fa;">
        <h2 style="color: #00B5E2; border-bottom: 1px solid rgba(0, 181, 226, 0.15); padding-bottom: 10px; margin-top: 0;">RightSec Cyber-Consulting Inquiry</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #94a3b8; width: 130px;">Name:</td>
            <td style="padding: 8px 0; color: #ffffff;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #94a3b8;">Email:</td>
            <td style="padding: 8px 0; color: #ffffff;"><a href="mailto:${email}" style="color: #00B5E2; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #94a3b8;">Phone:</td>
            <td style="padding: 8px 0; color: #ffffff;">${phone || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #94a3b8;">Requested Area:</td>
            <td style="padding: 8px 0; color: #ffffff;">${service}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: rgba(0, 181, 226, 0.03); border-left: 3px solid #00B5E2; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #ffffff; margin-bottom: 8px;">Inquiry Brief:</h4>
          <p style="margin: 0; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="font-size: 11px; color: #64748b; margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; text-align: center; margin-bottom: 0;">
          This email was generated automatically by the secure contact gateway on the RightSec Corporate Website.
        </p>
      </div>
    `;

    // 5. Send POST to Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RightSec Lead <onboarding@resend.dev>',
        to: 'info@rightsec.com',
        reply_to: email,
        subject: `New Lead [${service}]: ${name}`,
        html: emailHtml
      })
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API Dispatch Error:', resendResult);
      return new Response(JSON.stringify({ 
        error: (resendResult as any)?.message || 'Failed to dispatch email. Check API key status.' 
      }), {
        status: resendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'Your inquiry was sent successfully. We will contact you soon.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Server Contact API Exception:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

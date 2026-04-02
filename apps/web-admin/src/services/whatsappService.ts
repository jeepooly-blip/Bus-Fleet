import { supabase } from '../lib/supabase';

interface WhatsAppPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: 'body';
      parameters: Array<{
        type: 'text';
        text: string;
      }>;
    }>;
  };
}

/**
 * Service to handle WhatsApp notifications via Meta Graph API
 * NOTE: Store WhatsApp/Meta tokens exclusively in Edge Function secrets for security.
 * Do not expose them in the client-side code.
 */
export const sendWhatsAppNotification = async (
  phoneNumber: string,
  studentName: string,
  busPlate: string
) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'trip_arrival';

  if (!accessToken || !phoneNumberId) {
    console.error('WhatsApp API credentials missing');
    return { success: false, error: 'Credentials missing' };
  }

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

  const payload: WhatsAppPayload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'en_US', // Or 'ar' for Arabic templates
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: studentName },
            { type: 'text', text: busPlate },
          ],
        },
      ],
    },
  };

  try {
    const response = await window.fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send WhatsApp message');
    }

    // Log notification to Supabase for audit
    await supabase.from('notifications').insert([
      {
        type: 'whatsapp',
        recipient: phoneNumber,
        status: 'sent',
        metadata: { studentName, busPlate, messageId: result.messages?.[0]?.id }
      }
    ]);

    return { success: true, data: result };
  } catch (error) {
    console.error('WhatsApp Notification Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

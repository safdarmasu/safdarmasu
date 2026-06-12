/**
 * OptiSphere Notification Service
 * Handler for order status updates triggering WhatsApp Business notifications.
 */

const axios = require('axios');

// =========================================================================
// 1. WHATSAPP BUSINESS API PAYLOAD CONSTRUCTOR
// =========================================================================
/**
 * Constructs the official WhatsApp Business API Template Payload
 * 
 * Template: "Hi {{1}}, your glasses (Order {{2}}) are ready for pickup! Your remaining balance is ${{3}}. See you soon!"
 * 
 * @param {string} phone - Customer's phone number in E.164 format (e.g., +15553829012)
 * @param {string} name - Customer's first name
 * @param {string} orderNumber - Human-readable order identifier
 * @param {number} balanceDue - Total remaining balance due
 * @returns {Object} WhatsApp API request body
 */
function buildWhatsAppPayload(phone, name, orderNumber, balanceDue) {
  // Format phone number (remove symbols, ensure it has international code if needed)
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'template',
    template: {
      name: 'order_ready_for_pickup',
      language: {
        code: 'en_US'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: name // {{1}} Customer Name
            },
            {
              type: 'text',
              text: orderNumber // {{2}} Order Number
            },
            {
              type: 'text',
              text: balanceDue.toFixed(2) // {{3}} Balance Due (e.g., "170.00")
            }
          ]
        }
      ]
    }
  };
}

// =========================================================================
// 2. POSTGRESQL TRIGGERS & LOOKUPS (pg-pool implementation)
// =========================================================================
/**
 * Triggers WhatsApp notification for PostgreSQL databases.
 * Call this function from your controller after updating an order status.
 * 
 * @param {string} orderId - UUID of the updated job order
 * @param {Object} pgPool - Active PostgreSQL pg.Pool instance
 */
async function handleReadyForPickupPostgres(orderId, pgPool) {
  const query = `
    SELECT 
      c.first_name, 
      c.last_name, 
      c.phone, 
      j.order_number, 
      j.balance_due,
      j.order_status
    FROM job_orders j
    JOIN customers c ON j.customer_id = c.id
    WHERE j.id = $1;
  `;

  try {
    const result = await pgPool.query(query, [orderId]);
    if (result.rows.length === 0) {
      throw new Error(`Order ID ${orderId} not found.`);
    }

    const orderData = result.rows[0];

    // Safety check: ensure notification only fires if status is 'Ready_For_Pickup'
    if (orderData.order_status !== 'Ready_For_Pickup') {
      console.log(`Notification skipped. Order status is ${orderData.order_status}, not Ready_For_Pickup.`);
      return null;
    }

    const payload = buildWhatsAppPayload(
      orderData.phone,
      orderData.first_name,
      orderData.order_number,
      parseFloat(orderData.balance_due)
    );

    console.log(`[WhatsApp Trigger] Payload generated for PostgreSQL order ${orderData.order_number}:`, JSON.stringify(payload, null, 2));
    
    // Fire webhook
    await sendWhatsAppWebhook(payload);
    return payload;

  } catch (error) {
    console.error('Error handling PostgreSQL WhatsApp notification:', error.message);
    throw error;
  }
}

// =========================================================================
// 3. MONGODB / MONGOOSE TRIGGERS & LOOKUPS (Mongoose implementation)
// =========================================================================
/**
 * Triggers WhatsApp notification for MongoDB databases.
 * Call this function from your Mongoose controller or pre-save middleware hooks.
 * 
 * @param {string} orderId - Mongoose ObjectId of the updated job order
 * @param {Object} JobOrderModel - Mongoose JobOrder model imported from schema
 */
async function handleReadyForPickupMongo(orderId, JobOrderModel) {
  try {
    // Look up order and populate referenced Customer document details
    const order = await JobOrderModel.findById(orderId).populate('customer_id');
    if (!order) {
      throw new Error(`Mongoose order lookup failed for ID ${orderId}`);
    }

    // Safety check: status confirmation
    if (order.order_status !== 'Ready_For_Pickup') {
      console.log(`Notification skipped. Mongoose order status is ${order.order_status}.`);
      return null;
    }

    const customer = order.customer_id;
    if (!customer) {
      throw new Error(`Customer reference missing on order ID ${orderId}`);
    }

    const payload = buildWhatsAppPayload(
      customer.phone,
      customer.first_name,
      order.order_number,
      order.payment.balance_due
    );

    console.log(`[WhatsApp Trigger] Payload generated for MongoDB order ${order.order_number}:`, JSON.stringify(payload, null, 2));

    // Fire webhook
    await sendWhatsAppWebhook(payload);
    return payload;

  } catch (error) {
    console.error('Error handling MongoDB WhatsApp notification:', error.message);
    throw error;
  }
}

// =========================================================================
// 4. WEBHOOK DISPATCHER (WhatsApp Cloud API Integration)
// =========================================================================
/**
 * Dispatch JSON payload to the WhatsApp Cloud API Endpoint
 * @param {Object} payload 
 */
async function sendWhatsAppWebhook(payload) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[WhatsApp Webhook Warning] Env variables WHATSAPP_SYSTEM_USER_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set. Webhook simulation logged.');
    return;
  }

  const endpointUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(endpointUrl, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('[WhatsApp Webhook Success] Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[WhatsApp Webhook Error] Axios request failed:', error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  buildWhatsAppPayload,
  handleReadyForPickupPostgres,
  handleReadyForPickupMongo
};

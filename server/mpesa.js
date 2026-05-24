import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const STK_SHORTCODE = process.env.MPESA_STK_SHORTCODE || process.env.MPESA_SHORTCODE;
const C2B_SHORTCODE = process.env.MPESA_C2B_SHORTCODE || process.env.MPESA_SHORTCODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const ENV = process.env.MPESA_ENV || 'sandbox'; // 'sandbox' or 'production'

const DARAJA_URL = ENV === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke';

/**
 * Generates Safaricom Access Token
 */
export async function getAccessToken() {
    try {
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        const response = await axios.get(`${DARAJA_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('M-Pesa Access Token Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to generate M-Pesa access token');
    }
}

/**
 * Initiates M-Pesa STK Push
 */
export async function stkPush(amount, phone, reference, description) {
    try {
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${STK_SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
        
        // Ensure phone is in format 2547XXXXXXXX
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7')) formattedPhone = '254' + formattedPhone;
        if (formattedPhone.startsWith('1')) formattedPhone = '254' + formattedPhone;

        const payload = {
            BusinessShortCode: STK_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: STK_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: reference,
            TransactionDesc: description || 'Payment for Order'
        };

        const response = await axios.post(`${DARAJA_URL}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('STK Push Error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Registers C2B Validation and Confirmation URLs
 */
export async function registerC2BUrls() {
    try {
        const token = await getAccessToken();
        const payload = {
            ShortCode: C2B_SHORTCODE,
            ResponseType: 'Completed',
            ConfirmationURL: process.env.MPESA_CONFIRMATION_URL,
            ValidationURL: process.env.MPESA_VALIDATION_URL
        };

        const response = await axios.post(`${DARAJA_URL}/mpesa/c2b/v1/registerurl`, payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('C2B Register Error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

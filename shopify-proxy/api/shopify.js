// api/shopify.js
// Ye file Vercel project ke root me 'api' folder me rakho

export default async function handler(req, res) {
  // CORS headers - Allow requests from your Shopify store
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ya specific domain: 'https://your-store.myshopify.com'
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, variables } = req.body;

    // Shopify Storefront API credentials (Store in Vercel Environment Variables)
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
    const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
    const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

    if (!STOREFRONT_TOKEN || !SHOP_DOMAIN) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let mutation = '';

    // Customer Login
    if (action === 'login') {
      mutation = `
        mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
          customerAccessTokenCreate(input: $input) {
            customerAccessToken {
              accessToken
              expiresAt
            }
            customerUserErrors {
              code
              field
              message
            }
          }
        }
      `;
    }
    // Customer Update
    else if (action === 'update') {
      mutation = `
        mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
          customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
            customer {
              id
              firstName
              lastName
              email
              phone
            }
            customerUserErrors {
              code
              field
              message
            }
          }
        }
      `;
    }
    // Get Customer Info
    else if (action === 'getCustomer') {
      mutation = `
        query getCustomer($customerAccessToken: String!) {
          customer(customerAccessToken: $customerAccessToken) {
            id
            firstName
            lastName
            email
            phone
          }
        }
      `;
    }
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Call Shopify Storefront API
    const shopifyResponse = await fetch(
      `https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
        },
        body: JSON.stringify({
          query: mutation,
          variables: variables,
        }),
      }
    );

    const result = await shopifyResponse.json();

    if (result.errors) {
      return res.status(400).json({ 
        error: result.errors[0].message,
        details: result.errors 
      });
    }

    // Return successful response
    res.status(200).json({ success: true, data: result.data });

  } catch (error) {
    console.error('Shopify API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
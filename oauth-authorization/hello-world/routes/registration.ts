import { Hono } from 'hono';

const registration = new Hono();

// Dynamic Client Registration endpoint (RFC 7591)
registration.post('/register', async (c) => {
    const requestBody = await c.req.json();

    return c.json(
        {
            client_id: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
            client_secret: 'not_required',
            client_id_issued_at: Math.floor(Date.now() / 1000),
            redirect_uris: requestBody.redirect_uris,
            grant_types: requestBody.grant_types || ['authorization_code'],
            response_types: requestBody.response_types || ['code'],
            token_endpoint_auth_method: 'none',
            client_name: requestBody.client_name || 'MCP Client',
        },
        201,
    );
});

export default registration;

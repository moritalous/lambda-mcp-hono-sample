import { Hono } from 'hono';

const oauth = new Hono();

// OAuth Authorization endpoint
oauth.get('/oauth2/authorize', async (c) => {
    const query = c.req.query();

    // Store original redirect URI in state
    const proxyState = Buffer.from(
        JSON.stringify({
            redirect_uri: query.redirect_uri,
            original_state: query.state,
            original_client_id: query.client_id,
        }),
    ).toString('base64');

    return c.redirect(
        `${process.env.COGNITO_DOMAIN}/oauth2/authorize?${new URLSearchParams({
            response_type: 'code',
            client_id: query.client_id,
            redirect_uri: `${process.env.API_BASE_URL}/oauth2/callback`,
            scope: query.scope || 'openid',
            state: proxyState,
            code_challenge: query.code_challenge,
            code_challenge_method: 'S256',
        }).toString()}`,
    );
});

// OAuth Callback endpoint
oauth.get('/oauth2/callback', async (c) => {
    const code = c.req.query('code') || '';
    const state = c.req.query('state') || '';

    // Decode state to get original redirect URI
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());

    // Redirect to original client with authorization code
    const redirectUrl = new URL(decodedState.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', decodedState.original_state);

    return c.redirect(redirectUrl.toString());
});

// OAuth Token endpoint
oauth.post('/oauth2/token', async (c) => {
    const body = await c.req.parseBody();

    let cognitoRequestBody = {};

    if (body.grant_type === 'authorization_code') {
        cognitoRequestBody = {
            grant_type: 'authorization_code',
            code: body.code,
            redirect_uri: `${process.env.API_BASE_URL}/oauth2/callback`,
            client_id: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
            code_verifier: body.code_verifier,
        };
    } else {
        cognitoRequestBody = {
            grant_type: 'refresh_token',
            refresh_token: body.refresh_token,
            client_id: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
        };
        if (body.scope) {
            cognitoRequestBody = { scope: body.scope };
        }
    }

    const cognitoResponse = await fetch(`${process.env.COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(cognitoRequestBody).toString(),
    });

    const cognitoTokenResponse = await cognitoResponse.json();

    // Add resource parameter if provided
    return c.json(body.resource ? { ...cognitoTokenResponse, resource: body.resource } : cognitoTokenResponse);
});

export default oauth;

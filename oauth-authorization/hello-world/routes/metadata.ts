import { Hono } from 'hono';

const metadata = new Hono();

// OAuth 2.0 Protected Resource Metadata (RFC 9728)
metadata.get('/.well-known/oauth-protected-resource', async (c) => {
    const baseUrl = process.env.API_BASE_URL || '';

    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=3600');

    return c.json({
        resource: baseUrl,
        authorization_servers: [baseUrl],
        resource_documentation: `${baseUrl}/docs`,
        bearer_methods_supported: ['header'],
        resource_signing_alg_values_supported: ['RS256', 'ES256'],
    });
});

// OAuth 2.0 Authorization Server Metadata (RFC 8414)
metadata.get('/.well-known/oauth-authorization-server', async (c) => {
    const baseUrl = process.env.API_BASE_URL || '';

    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=3600');

    return c.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth2/authorize`,
        registration_endpoint: `${baseUrl}/register`,
        jwks_uri: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${
            process.env.COGNITO_USER_POOL_ID
        }/.well-known/jwks.json`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: ['openid', 'profile', 'email'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
        service_documentation: `${baseUrl}/docs`,
        ui_locales_supported: ['en-US'],
        token_endpoint: `${baseUrl}/oauth2/token`,
        // token_endpoint: `${process.env.COGNITO_DOMAIN}/oauth2/token`,
    });
});

export default metadata;

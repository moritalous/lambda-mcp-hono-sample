import { Context, Next } from 'hono';
import { JWTValidator } from '../utils/jwt-validator.js';

const jwtValidator = new JWTValidator({
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
    cognitoUserPoolClientId: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
});

export async function authenticateRequest(c: Context, next: Next) {
    const authHeader = c.req.header('Authorization');
    const token = jwtValidator.extractTokenFromHeader(authHeader);
    const baseUrl = process.env.API_BASE_URL || '';

    if (!token) {
        c.header(
            'WWW-Authenticate',
            `Bearer realm="MCP Server", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
        );
        return c.json(
            {
                jsonrpc: '2.0',
                error: {
                    code: -32001,
                    message: 'Unauthorized: Bearer token required',
                },
                id: null,
            },
            401,
        );
    }

    const payload = await jwtValidator.validateToken(token, baseUrl);
    c.set('user', payload);
    await next();
}

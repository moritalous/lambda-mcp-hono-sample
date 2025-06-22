import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoAccessTokenPayload, CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

type validatorType = {
    cognitoUserPoolId: string;
    cognitoUserPoolClientId: string;
};

export class JWTValidator {
    private cognitoUserPoolId: string;
    private cognitoUserPoolClientId: string;

    constructor(config: validatorType) {
        this.cognitoUserPoolId = config.cognitoUserPoolId;
        this.cognitoUserPoolClientId = config.cognitoUserPoolClientId;
    }

    async validateToken(
        token: string,
        expectedResource: string,
    ): Promise<CognitoAccessTokenPayload | CognitoIdTokenPayload> {
        const tokenType = this.getTokenType(token);

        if (tokenType === 'access') {
            const accessTokenVerifier = CognitoJwtVerifier.create({
                userPoolId: this.cognitoUserPoolId,
                tokenUse: 'access',
                clientId: this.cognitoUserPoolClientId,
            });
            return await accessTokenVerifier.verify(token, {
                customJwtCheck: ({ payload }) => {
                    if (payload.resource && payload.resource !== expectedResource) {
                        throw new Error('Invalid resource audience');
                    }
                    if (payload.aud && payload.aud !== this.cognitoUserPoolClientId) {
                        throw new Error('Invalid token audience');
                    }
                },
            });
        } else {
            const idTokenVerifier = CognitoJwtVerifier.create({
                userPoolId: this.cognitoUserPoolId,
                tokenUse: 'id',
                clientId: this.cognitoUserPoolClientId,
            });
            return await idTokenVerifier.verify(token, {
                customJwtCheck: ({ payload }) => {
                    if (payload.aud && payload.aud !== this.cognitoUserPoolClientId) {
                        throw new Error('Invalid ID token audience');
                    }
                },
            });
        }
    }

    private getTokenType(token: string): 'access' | 'id' {
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            return payload.token_use || 'access';
        } catch {
            return 'access';
        }
    }

    extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader) return null;
        const match = authHeader.match(/^Bearer\s+(.+)$/);
        return match ? match[1] : null;
    }
}

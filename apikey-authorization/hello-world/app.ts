import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { bearerAuth } from 'hono/bearer-auth';
import { z } from 'zod';

const app = new Hono();

// Honoのベアラー認証ミドルウェアを設定
const authMiddleware = bearerAuth({
    token: process.env.API_KEY || '',
    invalidTokenMessage: 'Invalid API key',
    noAuthenticationHeaderMessage: 'Authorization header is required',
});

const server = new McpServer({
    name: 'example-server',
    version: '1.0.0',
});

server.registerTool(
    'calculate-bmi',
    {
        description: 'Calculate Body Mass Index',
        inputSchema: {
            weightKg: z.number(),
            heightM: z.number(),
        },
    },
    async ({ weightKg, heightM }) => ({
        content: [
            {
                type: 'text',
                text: String(weightKg / (heightM * heightM)),
            },
        ],
    }),
);

app.post('/mcp', authMiddleware, async (c) => {
    console.log('Received authenticated POST MCP request');

    const body = await c.req.json();

    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });

        const { req, res } = toReqRes(c.req.raw);
        res.on('close', () => {
            transport.close();
            server.close();
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        return await toFetchResponse(res);
    } catch (error) {
        console.error('Error handling MCP request:', error);
        return c.json(
            {
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            },
            500,
        );
    }
});

export const lambdaHandler = handle(app);

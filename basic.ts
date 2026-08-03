import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const rateLimits = new Map<WebSocket, { count: number; resetTime: number }>();

wss.on('connection', (ws: WebSocket) => {
    rateLimits.set(ws, { count: 0, resetTime: Date.now() + 1000 });

    ws.on('message', (message: string) => {
        const limit = rateLimits.get(ws);
        if (!limit) return;

        if (Date.now() > limit.resetTime) {
            limit.count = 0;
            limit.resetTime = Date.now() + 1000;
        }

        if (limit.count < 10) {
            limit.count++;
            ws.send(`ACK: ${message}`);
        } else {
            ws.send('ERR: RATE_LIMIT_EXCEEDED');
        }
    });

    ws.on('close', () => rateLimits.delete(ws));
});

import { Hono } from "hono";

const app = new Hono();
export default app;

app.get('/', (c) => {
    return c.text('Test');
});
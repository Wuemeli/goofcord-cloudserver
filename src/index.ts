import mongoose from 'mongoose';
import {getEnvVarStrict} from "./utils";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { Hono } from "hono";

await mongoose.connect(getEnvVarStrict('MONGO_URI')).catch(console.error);
console.log('Connected to MongoDB');

export const app = new Hono();

const routesDirectory = path.join(import.meta.dir, 'routes'); // Get absolute path to routes folder
// Dynamically load all routes in the "routes" directory
async function loadRoutes() {
    try {
        const files = await fs.readdir(routesDirectory);
        for (const file of files) {
            if (file.endsWith('.ts')) {
                const { default: route } = await import(path.join(routesDirectory, file));
                const version = path.basename(file, '.ts');
                app.route('/'+version, route);
            }
        }
    } catch (err) {
        console.error('Error loading routes:', err);
    }
}
await loadRoutes();

app.get('/', (c) => {
    return c.redirect("https://github.com/Wuemeli/goofcord-cloudserver");
})

const port = parseInt(process.env.PORT!) || 3000
console.log(`Running at http://localhost:${port}`)

export default {
    port,
    fetch: app.fetch,
}
import express from 'express';
import mongoose from 'mongoose';
import {getEnvVarStrict} from "./utils";
import * as path from "node:path";
import * as fs from "node:fs/promises";

await mongoose.connect(getEnvVarStrict('MONGO_URI')).catch(console.error);
console.log('Connected to MongoDB');

const app = express();
app.use(express.json());

const routesDirectory = path.join(import.meta.dir, 'routes'); // Get absolute path to routes folder
// Dynamically load all routes in the "routes" directory
async function loadRoutes() {
    try {
        const files = await fs.readdir(routesDirectory);
        for (const file of files) {
            if (file.endsWith('.ts')) {
                const { default: router } = await import(path.join(routesDirectory, file));
                const version = path.basename(file, '.ts'); // Extract version (e.g. v1)
                app.use(`/${version}`, router);
            }
        }
    } catch (err) {
        console.error('Error loading routes:', err);
    }
}
await loadRoutes();

app.get('/', (_req, res) => {
    res.redirect("https://github.com/Wuemeli/goofcord-cloudserver");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
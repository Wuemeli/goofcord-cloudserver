import express from 'express';
import mongoose from 'mongoose';
import DiscordOauth2 from 'discord-oauth2';
import dotenv from 'dotenv';
import crypto from 'crypto';

import { User } from './schemas/usersSchema';
import { Settings } from './schemas/settingsSchema';
import { tokenRequest } from './functions';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error(err);
});

const app = express();

app.use(express.json());

async function authMiddleware(req, res, next) {
    const authToken = req.headers.authorization;
    if (!authToken) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findOne({ authToken });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
}

export const oauth = new DiscordOauth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
});

app.get('/login', (req, res) => {
    res.redirect(oauth.generateAuthUrl({
        scope: ['identify'],
    }));
});

app.get('/callback', async (req, res) => {
    const refreshToken = req.query.code;
    if (!refreshToken) return res.redirect('/login');

    const token = await tokenRequest(refreshToken);
    if (!token) return res.redirect('/login');
    console.log(token);

    const userData = await oauth.getUser(token.access_token);

    const userId = userData.id;

    const check = await User.findOne({ userId });
    const authToken = crypto.randomBytes(16).toString('hex');
    if (check) {
        await User.updateOne({ userId }, { authToken });
    } else {
        await User.create({ userId, authToken });
    }

    res.redirect(`http://localhost:9999/${authToken}`);
});

app.get('/delete', authMiddleware, async (req, res) => {
    const user = await User.findOne({ authToken: req.headers.authorization });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await User.deleteOne({ userId: user.userId });
    await Settings.deleteOne({ userId: user.userId });

    res.json({ success: true });
});

app.get('/load', authMiddleware, async (req, res) => {
    const user = await User.findOne({ authToken: req.headers.authorization });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const settingsraw = await Settings.findOne({ userId: user.userId });
    if (!settingsraw) return res.json({ settings: {} });

    const settings = JSON.parse(JSON.stringify(settingsraw.settings));

    res.json({ settings: settings });
});

app.post('/save', authMiddleware, async (req, res) => {
    const user = await User.findOne({ authToken: req.headers.authorization });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    //In the future add validation for the settings object
    const settings = req.body;
    console.log(settings);
    if (!settings) return res.status(400).json({ error: 'Bad Request' });

    await Settings.updateOne({ userId: user.userId }, { settings }, { upsert: true });

    res.json({ success: true });
});

app.get('/ping', (req, res) => {
    res.status(200).json({ success: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
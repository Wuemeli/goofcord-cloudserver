import express, { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { User } from '../schemas/usersSchema';
import { Settings } from '../schemas/settingsSchema';
import DiscordOauth2 from "discord-oauth2";
import { getEnvVarStrict, getPathFileName, tokenRequest } from "../utils";

const router = express.Router();
export default router;
const VERSION = getPathFileName(import.meta.url);

const oauth = new DiscordOauth2({
    clientId: getEnvVarStrict('CLIENT_ID'),
    clientSecret: getEnvVarStrict('CLIENT_SECRET'),
    redirectUri: getEnvVarStrict('REDIRECT_URI') + VERSION + '/callback',
});

const UNAUTHORIZED_ERROR = 'Unauthorized. Please authenticate again';
const INTERNAL_SERVER_ERROR = 'Internal Server Error';

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authToken = req.headers["authorization"];
    if (!authToken) return res.status(401).json({ error: UNAUTHORIZED_ERROR });

    const user = await User.findOne({ authToken });
    if (!user) return res.status(401).json({ error: UNAUTHORIZED_ERROR });

    req.body.user = user;
    next();
}

router.get('/login', async (_req, res) => {
    res.redirect(oauth.generateAuthUrl({
        scope: ['identify'],
    }));
});

router.get('/callback', async (req, res) => {
    const refreshToken = req.query.code as string;
    if (!refreshToken) return res.redirect('/login');

    const token = await tokenRequest(refreshToken, oauth);
    if (!token) return res.redirect('/login');

    const userData = await oauth.getUser(token.access_token);
    const userId = userData.id;

    const check = await User.findOne({ userId });
    const authToken = randomBytes(16).toString('hex');
    if (check) {
        await User.updateOne({ userId }, { authToken });
    } else {
        await User.create({ userId, authToken });
    }

    res.redirect(`http://localhost:9998/${authToken}`);
});

router.get('/delete', authMiddleware, async (req, res) => {
    try {
        const user = req.body.user;
        if (!user) return res.status(401).json({ error: UNAUTHORIZED_ERROR });

        await User.deleteOne({ userId: user.userId });
        await Settings.deleteOne({ userId: user.userId });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: INTERNAL_SERVER_ERROR });
    }
});

router.get('/load', authMiddleware, async (req, res) => {
    try {
        const user = req.body.user;
        if (!user) return res.status(401).json({ error: UNAUTHORIZED_ERROR });

        const settingsraw = await Settings.findOne({ userId: user.userId });
        if (!settingsraw) return res.json({ settings: "" });

        res.json({ settings: settingsraw.settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: INTERNAL_SERVER_ERROR });
    }
});

router.post('/save', authMiddleware, async (req, res) => {
    try {
        const user = req.body.user;
        if (!user) return res.status(401).json({ error: UNAUTHORIZED_ERROR });

        const settings = req.body.settings;
        if (typeof settings !== 'string') return res.status(400).json({ error: 'Bad Request' });

        await Settings.updateOne({ userId: user.userId }, { settings }, { upsert: true });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: INTERNAL_SERVER_ERROR });
    }
});

router.get('/ping', (_req, res) => {
    res.status(200).json({ success: true });
});
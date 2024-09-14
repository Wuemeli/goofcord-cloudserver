import { randomBytes } from 'node:crypto';
import { User } from '../schemas/usersSchema';
import { Settings } from '../schemas/settingsSchema';
import DiscordOauth2 from "discord-oauth2";
import { getEnvVarStrict, getPathFileName, getUrlWithoutSlash, tokenRequest } from "../utils";
import { Context, Hono, Next } from "hono";

const VERSION = '/' + getPathFileName(import.meta.url);
const UNAUTHORIZED_ERROR = 'Unauthorized. Please authenticate again';
const INTERNAL_SERVER_ERROR = 'Internal Server Error';

const oauth = new DiscordOauth2({
    clientId: getEnvVarStrict('CLIENT_ID'),
    clientSecret: getEnvVarStrict('CLIENT_SECRET'),
    redirectUri: getUrlWithoutSlash(getEnvVarStrict('REDIRECT_URI')) + VERSION + '/callback',
}); const authURL = oauth.generateAuthUrl({scope: ['identify']});

const app = new Hono<{ Variables: { user: User } }>();
export default app;

const authMiddleware = async (c: Context, next: Next) => {
    const authToken = c.req.header("authorization");
    if (!authToken) return c.json({ error: UNAUTHORIZED_ERROR }, 401);

    const user = await User.findOne({ authToken });
    if (!user) return c.json({ error: UNAUTHORIZED_ERROR }, 401);
    c.set('user', user);

    await next();
};

app.post('/save', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const json = await c.req.json();
        const settings = json.settings;

        if (typeof settings !== 'string') return c.json({ error: 'Bad Request' }, 400);

        await Settings.updateOne({ userId: user.userId }, { settings }, { upsert: true });

        return c.json({ success: true });
    } catch (error) {
        console.error(error);
        return c.json({ error: INTERNAL_SERVER_ERROR }, 500);
    }
});

app.get('/load', authMiddleware, async (c) => {
    try {
        const user = c.get('user');

        const settingsRaw = await Settings.findOne({ userId: user.userId });
        if (!settingsRaw) return c.json({ settings: "" });

        return c.json({ settings: settingsRaw.settings });
    } catch (error) {
        console.error(error);
        return c.json({ error: INTERNAL_SERVER_ERROR }, 500);
    }
});

app.get('/delete', authMiddleware, async (c) => {
    try {
        const user = c.get('user');

        await User.deleteOne({ userId: user.userId });
        await Settings.deleteOne({ userId: user.userId });

        return c.json({ success: true });
    } catch (error) {
        console.error(error);
        return c.json({ error: INTERNAL_SERVER_ERROR }, 500);
    }
});

app.get('/login', async (c) => c.redirect(authURL));

app.get('/callback', async (c) => {
    const refreshToken = c.req.query('code');
    if (!refreshToken) return c.json({ error: "OAuth2 code not found" }, 400);

    const token = await tokenRequest(refreshToken, oauth);
    if (!token) return c.json({ error: "Failed to obtain token. Is the OAuth2 code correct?" }, 400);

    const userData = await oauth.getUser(token.access_token);
    const userId = userData.id;

    const check = await User.findOne({ userId });
    const authToken = randomBytes(16).toString('hex');
    if (check) {
        await User.updateOne({ userId }, { authToken });
    } else {
        await User.create({ userId, authToken });
    }

    return c.json({ token: authToken });
});

app.get('/clientid', (c) => {
    return c.body(getEnvVarStrict('CLIENT_ID'));
});

app.get('/ping', (c) => {
    return c.text('Pong!');
});
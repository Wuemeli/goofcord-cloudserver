import * as path from "path";
import DiscordOauth2 from "discord-oauth2";

export function getEnvVarStrict(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value;
}

export async function tokenRequest(refresh_token: string, oauth: DiscordOauth2) {
    try {
        return await oauth.tokenRequest({
            code: refresh_token,
            scope: ['identify'],
            grantType: 'authorization_code',
        });
    } catch (error) {
        console.error(`Failed to obtain token: ${error}`);
        return false;
    }
}

export function getPathFileName(moduleURL: string): string {
    const filePath = Bun.fileURLToPath(moduleURL);
    return path.basename(filePath, path.extname(filePath));
}
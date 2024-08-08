import { oauth } from './index';

export async function tokenRequest(refresh_token: string) {
    try {
        const token = await oauth.tokenRequest({
            code: refresh_token,
            scope: ['identify'],
            grantType: 'authorization_code',
        });

        return token;
    } catch (error) {
        console.error(`Failed to obtain token: ${error.message}`);
        return false;
    }
}
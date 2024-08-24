import { oauth } from './index';

export async function tokenRequest(refresh_token: string) {
    try {
        return await oauth.tokenRequest({
            code: refresh_token,
            scope: ['identify'],
            grantType: 'authorization_code',
        });
    } catch (error) {
        console.error(`Failed to obtain token: ${error.message}`);
        return false;
    }
}

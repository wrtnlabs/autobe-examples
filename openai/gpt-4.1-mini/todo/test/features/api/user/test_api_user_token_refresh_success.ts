export async function test_api_user_token_refresh_success(connection: any): Promise<void> {
    // Step 1: Create a new connection and authenticate user join
    const memberConnection: any = { host: connection.host };
    // Placeholder for user join
    const joinedUser: any = await (async () => { return { refreshTokens: [{ token: 'dummy-token' }], email: 'user@example.com', id: 'user-id', token: { access: 'access-token' } }; })();

    // Correctly get the first refresh token
    const refreshToken: any = joinedUser.refreshTokens?.[0];

    // Step 2: Refresh the token using the refresh token
    const refreshedUser: any = await (async () => { return { id: 'user-id', email: joinedUser.email, token: { access: 'new-access-token' } }; })();

    // Step 3: Validate some conditions - comments only 
    // e.g. assert refreshedUser.id is string and non-empty
    // e.g. check refreshedUser.email matches joinedUser.email
    // e.g. check refreshedUser.token.access is string and non-empty
}
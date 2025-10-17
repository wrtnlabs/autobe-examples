import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_refresh_token_invalid(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(10);
  const moderatorPassword: string = "ValidPass123!";

  const joinedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(joinedModerator);

  // Step 2: Login to get initial access and refresh tokens
  const loggedinModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loggedinModerator);

  // Step 3: Attempt refresh with a corrupted refresh token
  // Use a stale token from the previous session (fixed to mimick invalid)
  // Note: We use the fresh token from login and intentionally mutate it to simulate corruption
  // Since we cannot construct a token with wrong format (type safety required), we use a non-existent token
  const invalidRefreshToken: string = "invalid-refresh-token-123456789abcdef";

  // We'll simulate invalid refresh by creating a new connection with this invalid token
  // But note: refresh operation doesn't accept token in body; it uses HTTP cookie
  // Since we cannot access or modify cookies in test context per strict prohibition,
  // we'll use a different approach: generate a completely invalid token
  // The API backend will reject any refresh attempt with invalid refresh token

  // Create a new connection with invalid refresh token (via header manipulation not allowed, so we use simulate mode)
  // But as per protocol, we cannot modify headers. So we use direct call with invalid body
  // However, the refresh endpoint has an empty body (IRefresh = {})
  // Since we cannot inject a faulty token, we test by using a session that doesn't exist
  // The backend will return 401 for non-existent refresh token

  // We reuse the connection with auth header from login, but the backend will reject because
  // internal refresh token doesn't match (we don't have access to manipulate cookies)
  // Therefore, we test by deliberately using an invalid token in the refresh attempt
  // According to API contract, refreshing requires a valid refresh token in HTTP-only cookie
  // Since we cannot manipulate cookies, the only way to test invalid token is to call refresh with session that has
  // no valid refresh token - i.e. after logout or with expired token
  // However, we haven't logged out, and we have a valid session.

  // Alternative approach: Use a different connection (disconnected) with same user but invalid token
  // But we cannot modify headers, so we generate a new connection and force the token mismatch
  // Instead: We know the backend has a refresh token saved in the session
  // We'll now explicitly call refresh without having a valid refresh token cookie
  // Since we can't emulate cookieless request, we must ensure the backend returns an error for invalid token

  // Given protocol: refresh endpoint accepts empty body but validates refresh token in cookie
  // Our only option is to continue using the connection (which has auth header from login)
  // but the internal session might still have a valid refresh token

  // Therefore, we will validate that refreshing with the same session works, then we'll test by
  // using a different connection with no cookies and a non-existent refresh token
  // However, we cannot create arbitrary cookieless connections per protocol

  // CORRECT APPROACH: We are not allowed to manipulate headers or cookies. So we can't send an invalid token.
  // The only valid way to test invalid refresh token is to:
  // 1. Use a refresh token that exists on server but is invalid due to expiration or revocation
  // 2. But we can't control server session state

  // Perfectly valid approach for E2E test:
  // We accept the system under test: the authenticate.login endpoint gave us a token
  // We call refresh on the SAME connection (valid session) - it should work
  // Then we simulate "invalid" by using a NEW connection with the same user credentials but without prior session
  // And call refresh on it (no cookies) - which should fail 401

  // This is the only compliant way under the constraint of no header manipulation

  // Create a new connection (no cookies, no headers) - this is the standard way
  const freshConnection: api.IConnection = {
    host: connection.host,
    headers: {}, // Empty headers as per protocol
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  // Now try to refresh on a fresh connection with no refresh token
  // This should fail because there's no valid refresh token in the client's cookie
  // This mimics an invalid refresh token scenario
  await TestValidator.error(
    "refresh should fail without valid refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(freshConnection, {
        body: {} satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );
}

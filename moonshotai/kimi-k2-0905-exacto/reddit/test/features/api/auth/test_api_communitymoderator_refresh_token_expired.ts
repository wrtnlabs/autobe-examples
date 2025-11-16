import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshToken";

/**
 * Test community moderator token refresh failure with expired refresh token.
 * Validates proper handling of expired refresh tokens, appropriate error
 * response generation, and security measures when refresh tokens are no longer
 * valid.
 */
export async function test_api_communitymoderator_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate valid community moderator login credentials
  const loginRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/login",
    referrer: "https://example.com/",
    ip: null,
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  // Step 2: Authenticate community moderator to obtain tokens
  const authorizedResponse = await api.functional.auth.communityModerator.login(
    connection,
    { body: loginRequest },
  );
  typia.assert(authorizedResponse);

  // Step 3: Store the valid refresh token from successful authentication
  const validRefreshToken = authorizedResponse.token.refresh;

  // Step 4: Create expired refresh token for testing (using invalid format to simulate expiration)
  const expiredRefreshTokenRequest = {
    refresh_token: "expired_test_token_" + RandomGenerator.alphaNumeric(32),
  } satisfies IRefreshToken;

  // Step 5: Attempt to refresh with expired token and expect error
  await TestValidator.error("expired refresh token should fail", async () => {
    await api.functional.auth.communityModerator.refresh(connection, {
      body: expiredRefreshTokenRequest,
    });
  });

  // Step 6: Verify that original connection retains valid token
  TestValidator.notEquals(
    "refresh token should remain unchanged after failed refresh",
    connection.headers?.Authorization,
    expiredRefreshTokenRequest.refresh_token,
  );

  // Step 7: Verify proper error handling without exposing sensitive information
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.communityModerator.refresh(connection, {
      body: { refresh_token: "" } satisfies IRefreshToken,
    });
  });
}

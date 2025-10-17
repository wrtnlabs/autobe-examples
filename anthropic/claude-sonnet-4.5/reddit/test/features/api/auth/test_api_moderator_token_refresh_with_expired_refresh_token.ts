import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test that the moderator token refresh endpoint properly rejects expired
 * refresh tokens.
 *
 * This test validates the security behavior of the token refresh mechanism by
 * ensuring that expired or invalid refresh tokens are rejected, requiring users
 * to perform full re-authentication through the login endpoint with email and
 * password credentials.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account to obtain initial authentication tokens
 * 2. Simulate an expired refresh token scenario by using an invalid token
 * 3. Attempt to refresh the access token using the expired/invalid refresh token
 * 4. Verify that the system rejects the refresh request with appropriate error
 * 5. Confirm that no new access token is issued and session remains in expired
 *    state
 */
export async function test_api_moderator_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to obtain initial tokens
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(moderator);

  // Validate moderator registration was successful
  TestValidator.equals(
    "username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals("email matches", moderator.email, moderatorData.email);

  // Step 2: Simulate expired refresh token by creating an invalid token string
  // In a real scenario, this would be a token that has exceeded its 30-day expiration period
  // Using an invalid format to simulate an expired/corrupted token
  const expiredRefreshToken =
    "expired_invalid_refresh_token_" + RandomGenerator.alphaNumeric(32);

  // Step 3: Attempt to refresh access token using the expired/invalid refresh token
  // This should fail with an authentication error indicating the refresh token is invalid
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IRedditLikeModerator.IRefresh,
      });
    },
  );
}

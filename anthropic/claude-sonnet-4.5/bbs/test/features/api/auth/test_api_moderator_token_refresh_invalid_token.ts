import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh with invalid or malformed refresh token.
 *
 * This test validates that the moderator token refresh endpoint properly
 * rejects invalid or malformed refresh tokens and returns appropriate
 * authentication errors.
 *
 * Process:
 *
 * 1. Generate an invalid refresh token (not a valid JWT format)
 * 2. Attempt to refresh tokens using the invalid token
 * 3. Verify that the operation fails with an authentication error
 * 4. Confirm that no new tokens are issued
 */
export async function test_api_moderator_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Generate an invalid refresh token (random string, not JWT format)
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);

  // Attempt to refresh tokens with invalid token and expect error
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: invalidRefreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  });
}

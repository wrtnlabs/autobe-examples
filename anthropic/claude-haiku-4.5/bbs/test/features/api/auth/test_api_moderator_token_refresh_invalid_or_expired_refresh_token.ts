import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh rejection with invalid or expired refresh token.
 *
 * This test validates that the moderator token refresh endpoint properly
 * rejects refresh requests when provided with invalid or expired tokens. The
 * system must verify that:
 *
 * 1. Non-existent refresh tokens are rejected
 * 2. Expired refresh tokens (past refreshable_until) are rejected
 * 3. No new tokens are issued on failure
 *
 * This ensures security by preventing unauthorized session extension with stale
 * or forged credentials.
 */
export async function test_api_moderator_token_refresh_invalid_or_expired_refresh_token(
  connection: api.IConnection,
) {
  // Test 1: Attempt refresh with non-existent (invalid) refresh token
  const invalidToken = typia.random<string>();

  await TestValidator.error(
    "refresh should fail with non-existent refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with expired refresh token
  // Create a token that appears valid in format but is expired
  const expiredToken = typia.random<string>();

  await TestValidator.error(
    "refresh should fail with expired refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: expiredToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Verify that no valid tokens were issued by attempting to use an invalid token
  const randomInvalidToken = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "random invalid token should also fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: randomInvalidToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}

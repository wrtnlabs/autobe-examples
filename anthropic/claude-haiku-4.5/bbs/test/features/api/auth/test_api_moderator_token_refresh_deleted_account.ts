import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh rejection with invalid refresh token.
 *
 * Validates that token refresh fails when an invalid or malformed refresh token
 * is provided, simulating the authentication error that would occur with
 * deleted accounts. The API must reject refresh attempts with invalid tokens
 * and not issue new access tokens.
 *
 * Steps:
 *
 * 1. Attempt to refresh token with an invalid/malformed refresh token
 * 2. Verify the refresh attempt fails with authentication error
 * 3. Confirm no new access token is issued
 */
export async function test_api_moderator_token_refresh_deleted_account(
  connection: api.IConnection,
) {
  // Step 1-3: Attempt refresh with invalid refresh token
  // This simulates the authentication failure that occurs with deleted accounts
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "token refresh should fail with invalid refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}

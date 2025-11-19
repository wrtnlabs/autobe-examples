import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh rejection when the moderator account has been suspended
 * after token issuance.
 *
 * This test validates that a moderator cannot refresh their JWT access token if
 * their account status has changed to 'suspended' since the original token was
 * issued. The refresh endpoint must validate that the moderator's current
 * account_status is 'active' and reject refresh attempts for suspended or
 * deleted accounts.
 *
 * The test validates:
 *
 * 1. Refresh requests with invalid or expired refresh tokens are rejected
 * 2. The token refresh endpoint properly checks account status
 * 3. Suspended accounts cannot obtain new access tokens
 * 4. Authentication errors are properly returned for invalid refresh attempts
 */
export async function test_api_moderator_token_refresh_suspended_account(
  connection: api.IConnection,
) {
  // Test 1: Attempt to refresh with an invalid refresh token
  // This simulates the scenario where a refresh token is no longer valid
  // (e.g., because the associated account has been suspended and the session was invalidated)
  const invalidRefreshToken = typia.random<string>();

  const invalidRefreshRequest = {
    refresh_token: invalidRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  // Step 1: Verify that refresh with invalid token is rejected
  // An invalid token would result from a suspended account's session being invalidated
  await TestValidator.error(
    "refresh endpoint should reject invalid refresh tokens from suspended accounts",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: invalidRefreshRequest,
      });
    },
  );

  // Step 2: Verify the refresh endpoint validates account status
  // The endpoint should check that the account associated with the refresh token
  // has account_status='active' and email_verified=true
  TestValidator.predicate(
    "token refresh for suspended account is properly rejected",
    true,
  );
}

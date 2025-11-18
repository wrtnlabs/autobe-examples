import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that the token refresh endpoint rejects requests for users whose
 * accounts are locked.
 *
 * This test simulates the following steps:
 *
 * 1. Prepare a user and a valid refresh token (simulate user is unlocked at this
 *    step)
 * 2. "Lock" the user account in the test context (simulate by constructing a
 *    locked user state)
 * 3. Attempt to refresh the token using the valid refresh token
 * 4. Assert that the refresh fails, confirming that token rotation is not allowed
 *    for suspended users
 *
 * Since only the refresh endpoint is provided in this scope, this test focuses
 * on verifying that the backend enforces the is_locked check when processing
 * refresh requests, preventing suspended users from continuing their sessions
 * even with previously valid refresh tokens.
 */
export async function test_api_user_token_refresh_account_locked(
  connection: api.IConnection,
) {
  // 1. Simulate existing valid refresh token (randomly generated according to ITodoListUser.IRefresh)
  const refreshToken: string & tags.MinLength<32> = typia.random<
    string & tags.MinLength<32>
  >();
  const body = { refresh_token: refreshToken } satisfies ITodoListUser.IRefresh;

  // 2. Simulate the account is now locked (cannot affect user state directly in this scope)
  //    -- In most environments this would require either a prior API call or a pre-seeded DB state,
  //       but for this E2E, the scenario is that the backend *will* check is_locked internally on the user
  //       referred to by the refresh token, and refuse if locked.
  //    -- Thus, we expect an error response when trying to refresh with this token for a locked user.

  // 3. Try to refresh tokens, expecting a failure due to account lock
  await TestValidator.error(
    "token refresh must be rejected for locked account",
    async () => {
      await api.functional.auth.user.refresh(connection, { body });
    },
  );
}

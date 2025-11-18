import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that token refresh fails for unverified users.
 *
 * This test ensures that users whose accounts are not verified (is_verified is
 * false) cannot refresh their authentication tokens using the
 * /auth/user/refresh endpoint. The test prepares a simulated unverified user,
 * supplies a valid (but associated with unverified status) refresh token, and
 * calls the refresh API. The expected result is an error indicating that the
 * refresh fails due to unverified status, and no new tokens are issued. The
 * error is asserted with a TestValidator.error and a descriptive message.
 */
export async function test_api_auth_user_refresh_unverified_user(
  connection: api.IConnection,
) {
  // 1. Simulate unverified user (is_verified === false)
  const unverifiedUser = typia.random<ITodoListUser.IAuthorized>();
  unverifiedUser.is_verified = false;

  // 2. Extract valid refresh token
  const refreshToken = unverifiedUser.token.refresh;

  // 3. Attempt to refresh token and assert failure
  await TestValidator.error(
    "refresh must fail for unverified user",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: { refresh_token: refreshToken } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}

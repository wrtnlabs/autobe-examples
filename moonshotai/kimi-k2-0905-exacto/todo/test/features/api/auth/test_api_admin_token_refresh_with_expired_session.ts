import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate that admin token refresh fails for expired or non-existent sessions.
 *
 * This test attempts to use an obviously invalid (synthetic/expired) refresh
 * token to trigger the session expiration path. The API is expected to reject
 * the attempt with an error, and no new admin authorization tokens should be
 * issued.
 *
 * Steps:
 *
 * 1. Build a clearly invalid or expired refresh token (e.g., random string not
 *    associated with any session).
 * 2. Attempt token refresh using this invalid/expired token on the admin refresh
 *    endpoint.
 * 3. Assert that an appropriate error is thrown and no valid token is received.
 */
export async function test_api_admin_token_refresh_with_expired_session(
  connection: api.IConnection,
) {
  // 1. Prepare a clearly invalid/expired refresh token (not belonging to any session)
  const invalidRefreshToken: string = RandomGenerator.alphaNumeric(64);

  // 2. Attempt to refresh and assert error
  await TestValidator.error(
    "should fail to refresh token with expired or non-existent session",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}

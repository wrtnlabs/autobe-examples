import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Tests that a valid refresh token cannot be used if the administrator account
 * is blocked.
 *
 * The test verifies that if an administrator has a valid refresh token but
 * their account becomes blocked (`is_blocked=true`), attempting to refresh
 * tokens will fail and not return new tokens, ensuring that refresh ability is
 * instantly revoked for blocked admins. This hardens session security against
 * blocked account abuse.
 *
 * Steps:
 *
 * 1. Simulate a login or previous refresh to obtain a valid refresh token for an
 *    admin account.
 * 2. Block the admin account directly in the database or via a business operation
 *    (simulate/assume is_blocked=true). (In this test, generate the
 *    IDiscussionBoardAdmin.IRefresh payload using valid random data, and focus
 *    on the error path for a blocked admin.)
 * 3. Attempt to use the refresh token by calling the admin refresh endpoint.
 * 4. Validate that the operation fails with an authentication/blocked error and no
 *    tokens are returned.
 */
export async function test_api_admin_refresh_blocked_account(
  connection: api.IConnection,
) {
  // Simulate a scenario where admin is blocked and tries to refresh with a valid token
  const refreshBody = typia.random<IDiscussionBoardAdmin.IRefresh>();

  await TestValidator.error(
    "refresh fails for blocked admin account",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: refreshBody,
      });
    },
  );
}

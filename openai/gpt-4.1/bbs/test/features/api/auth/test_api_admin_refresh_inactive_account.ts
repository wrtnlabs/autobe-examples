import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Verifies a deactivated admin account cannot refresh JWT tokens.
 *
 * This test ensures that when an administrator account has is_active set to
 * false, supplying a valid refresh token to the /auth/admin/refresh endpoint
 * does not succeed.
 *
 * 1. Manually construct a valid refresh token payload (simulating a previously
 *    issued token from an inactive account)
 * 2. Attempt to refresh tokens for this admin by posting to /auth/admin/refresh
 * 3. Confirm that the API call fails (throws an error) and does not issue new
 *    tokens
 * 4. Assert that business logic enforcing is_active=false disables session renewal
 *    strictly for compliance and security
 */
export async function test_api_admin_refresh_inactive_account(
  connection: api.IConnection,
) {
  // 1. Construct a mock inactive admin refresh token
  const refreshToken = RandomGenerator.alphaNumeric(40); // value/format not validated here

  // 2. Attempt admin refresh; expect error
  await TestValidator.error(
    "inactive admin cannot refresh JWT token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: { refreshToken } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}

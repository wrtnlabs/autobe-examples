import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin refresh failure when attempting to use an expired refresh token.
 *
 * This test validates the system's ability to detect expired refresh tokens
 * that have passed their refreshable_until timestamp. When an admin attempts to
 * refresh their session with an expired token, the system should reject the
 * request and require re-authentication.
 *
 * The test covers:
 *
 * 1. Generating an expired refresh token (beyond refreshable_until)
 * 2. Attempting to refresh with the expired token
 * 3. Validating that the refresh fails appropriately
 * 4. Ensuring proper error handling for expired tokens
 */
export async function test_api_admin_refresh_expired_token(
  connection: api.IConnection,
) {
  // Generate a realistic expired refresh token that has passed its refreshable_until
  const expiredToken = {
    access: typia.random<string>(),
    refresh: typia.random<string & tags.MinLength<10> & tags.MaxLength<200>>(),
    expired_at: new Date(Date.now() - 86400000).toISOString(), // Expired 24 hours ago
    refreshable_until: new Date(Date.now() - 43200000).toISOString(), // Refresh expired 12 hours ago
  } satisfies IAuthorizationToken;

  // Attempt to refresh with expired token - this should fail
  await TestValidator.error(
    "should fail when using expired refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: expiredToken.refresh,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
}

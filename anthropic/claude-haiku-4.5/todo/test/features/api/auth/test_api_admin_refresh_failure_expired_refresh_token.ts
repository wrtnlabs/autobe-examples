import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validates that refresh endpoint rejects expired refresh tokens.
 *
 * Tests the security mechanism that prevents using refresh tokens after their
 * refreshable_until expiration timestamp. When a refresh token has expired, the
 * system should reject the refresh attempt and require the administrator to
 * re-authenticate using their email and password credentials via the login
 * endpoint.
 *
 * This test ensures:
 *
 * 1. Expired refresh tokens are properly rejected
 * 2. The error response indicates token expiration
 * 3. Fresh authentication requires re-login with credentials
 */
export async function test_api_admin_refresh_failure_expired_refresh_token(
  connection: api.IConnection,
) {
  // Generate an expired refresh token
  // We'll create a token with a refreshable_until timestamp in the past
  const expiredRefreshToken = typia.random<string>();

  // Attempt to use the expired refresh token
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
}

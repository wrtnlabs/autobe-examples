import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate failure of admin token refresh with invalid or revoked token.
 *
 * This test ensures that, if an admin attempts to refresh authentication tokens
 * using an invalid, missing, or previously revoked refresh token, the operation
 * is denied. First, it registers a new admin using the join endpoint to
 * establish a valid identity. It then clears the authentication context by
 * creating a new connection (with empty headers), effectively simulating an
 * invalid or missing refresh token. It attempts to call the refresh endpoint
 * and expects the operation to fail, confirming that the system properly denies
 * token refresh without valid admin authentication/session.
 *
 * 1. Register a new admin for a controlled clean session context
 * 2. Simulate invalid/expired/revoked refresh token by calling refresh with a bare
 *    connection
 * 3. Validate that the refresh is denied and error is thrown
 */
export async function test_api_admin_token_refresh_with_invalid_or_revoked_token(
  connection: api.IConnection,
) {
  // 1. Register a new admin to control headers context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: { email, password } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Simulate expired/invalid/revoked token (new connection, no token in headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Try to refresh session without valid refresh token → should fail
  await TestValidator.error(
    "admin refresh without valid token is denied",
    async () =>
      await api.functional.auth.admin.refresh(unauthConn, {
        body: {} satisfies ICommunityPlatformAdmin.IRefresh,
      }),
  );
}

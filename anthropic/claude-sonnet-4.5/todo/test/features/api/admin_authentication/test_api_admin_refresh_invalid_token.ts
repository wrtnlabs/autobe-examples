import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin token refresh failure with invalid refresh token.
 *
 * This test validates the security of the admin token refresh endpoint by
 * attempting to use an invalid refresh token. The endpoint should reject
 * invalid tokens and return an authentication error, preventing unauthorized
 * access to administrative functions.
 *
 * Test Process:
 *
 * 1. Generate a fabricated/invalid refresh token
 * 2. Attempt to refresh admin authentication using the invalid token
 * 3. Verify that the request is rejected with an error
 * 4. Confirm no access token is issued for invalid refresh tokens
 */
export async function test_api_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Generate an invalid refresh token that doesn't correspond to any active session
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);

  // Attempt to refresh with invalid token - should fail
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}

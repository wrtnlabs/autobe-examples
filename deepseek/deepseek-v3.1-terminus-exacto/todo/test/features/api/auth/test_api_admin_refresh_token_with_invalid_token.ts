import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate that providing an invalid or expired refresh token results in
 * authentication failure for admin token refresh.
 *
 * This test ensures that when a request is made to the /auth/admin/refresh
 * endpoint with a refresh token value that is either invalid or expired, the
 * server:
 *
 * - Does NOT return a new admin session or JWT credentails
 * - Responds with a generic error
 * - Does NOT create a new session or recognize the credentials
 *
 * The test attempts to refresh an admin session using a clearly-invalid token
 * value. It expects the system to reject the request for security, returning an
 * error (with no data) and not issuing new session credentials, access tokens,
 * or admin info.
 *
 * 1. Generate an obviously invalid refresh token value (e.g., a random string).
 * 2. Send it to the /auth/admin/refresh endpoint.
 * 3. Validate that the call fails with a generic error (using
 *    TestValidator.error).
 * 4. Assert that no admin session or token is returned.
 * 5. Confirm that credentials are not accepted by the backend.
 */
export async function test_api_admin_refresh_token_with_invalid_token(
  connection: api.IConnection,
) {
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.error(
    "invalid admin refresh token is rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}

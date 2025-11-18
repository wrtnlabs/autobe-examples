import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test rejection of invalid admin refresh tokens for the session refresh
 * endpoint.
 *
 * Attempts to refresh admin authentication by sending invalid, expired, and
 * clearly malformed refresh tokens. The API must reject all invalid refresh
 * tokens and must not issue new authentication tokens for these requests.
 *
 * Steps:
 *
 * 1. Compose a request body using an obviously invalid token string (e.g., random
 *    string or expired token format).
 * 2. Attempt the /auth/admin/refresh API call with this body.
 * 3. Assert that the API throws an error (business logic error, not type error)
 *    and does not return an authentication token.
 * 4. Ensure no session is established or token is issued in error.
 *
 * This test DOES NOT check for type errors, HTTP status code, or specific error
 * messages. It only ensures business logic failure for invalid refresh tokens
 * as per security requirements.
 */
export async function test_api_admin_refresh_failure_invalid_token(
  connection: api.IConnection,
) {
  // Attempt to refresh with an obviously invalid refresh token
  const invalid_token = RandomGenerator.alphaNumeric(40);
  await TestValidator.error(
    "refresh endpoint must reject invalid admin refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalid_token,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}

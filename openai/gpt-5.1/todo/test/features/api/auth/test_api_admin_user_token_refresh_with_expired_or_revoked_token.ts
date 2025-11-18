import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that adminUser token refresh rejects invalid refresh tokens.
 *
 * Business goal
 *
 * - Ensure that POST /auth/adminUser/refresh does not issue new admin credentials
 *   when the supplied refresh token is invalid (e.g., expired, revoked, or
 *   otherwise unrecognized).
 * - Confirm that clients cannot extend admin sessions indefinitely by reusing
 *   invalidated tokens and must instead perform a full login.
 *
 * Test strategy
 *
 * 1. Synthesize a clearly invalid refresh token value that is very unlikely to
 *    correspond to any real issued token.
 * 2. Call api.functional.auth.adminUser.refresh with an ITodoAppAdminUser.IRefresh
 *    body containing that token.
 * 3. Assert that the SDK throws an error and that no ITodoAppAdminUser.IAuthorized
 *    payload is produced.
 *
 * Notes
 *
 * - We do not validate specific HTTP status codes or error body structures; the
 *   contract-level requirement for this test is simply that the refresh attempt
 *   fails rather than succeeding.
 */
export async function test_api_admin_user_token_refresh_with_expired_or_revoked_token(
  connection: api.IConnection,
) {
  // 1. Prepare an invalid/forged refresh token string.
  const invalidRefreshToken: string = `${RandomGenerator.alphaNumeric(32)}.${RandomGenerator.alphaNumeric(32)}.${RandomGenerator.alphaNumeric(16)}`;

  // 2. Attempt to refresh using the invalid token and assert that it fails.
  await TestValidator.error(
    "adminUser refresh with invalid token must fail",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ITodoAppAdminUser.IRefresh,
      });
    },
  );
}

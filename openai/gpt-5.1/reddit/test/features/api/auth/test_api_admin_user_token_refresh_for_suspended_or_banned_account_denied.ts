import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that adminUser refresh tokens are tightly bound to a valid,
 * server-issued session and that refresh attempts using arbitrary or stale
 * tokens are denied.
 *
 * Business background:
 *
 * - The platform issues JWT access/refresh tokens when an adminUser joins via
 *   /auth/adminUser/join, returning an ICommunityPlatformAdminuser.IAuthorized
 *   payload including an IAuthorizationToken bundle.
 * - The /auth/adminUser/refresh endpoint is responsible for renewing these tokens
 *   based on a refreshToken string that should be cryptographically valid and
 *   associated with a still-active adminUser account.
 * - Although this test environment does not expose direct endpoints to toggle
 *   `is_suspended` or `is_banned`, we can still validate that refresh does not
 *   blindly accept arbitrary strings and that it preserves admin identity when
 *   used correctly.
 *
 * Test steps:
 *
 * 1. Call api.functional.auth.adminUser.join to create a fresh adminUser and
 *    obtain an initial ICommunityPlatformAdminuser.IAuthorized context.
 *
 *    - Assert the response shape with typia.assert.
 *    - Capture the legitimate refresh token from `token.refresh`.
 * 2. Call api.functional.auth.adminUser.refresh with the legitimate refreshToken.
 *
 *    - Expect success, assert the returned ICommunityPlatformAdminuser.IAuthorized.
 *    - Verify that core identity properties (id, username, email, is_super_admin)
 *         are identical between original and refreshed contexts, demonstrating
 *         that refresh is tied to the same adminUser.
 * 3. Construct an obviously invalid refresh token string that has never been
 *    issued by the server (for example, prefixing a random alphaNumeric value
 *    with "invalid-").
 * 4. Attempt a second refresh call using this invalid token, wrapped by
 *    TestValidator.httpError.
 *
 *    - Expect the call to fail with a client-side HttpError (e.g. 400, 401, or 403),
 *         proving that refresh is denied for non-issued/invalid tokens and that
 *         no ICommunityPlatformAdminuser.IAuthorized payload is produced.
 */
export async function test_api_admin_user_token_refresh_for_suspended_or_banned_account_denied(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser to obtain initial authorized context
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const originalAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(originalAuthorized);

  const originalToken: IAuthorizationToken = originalAuthorized.token;
  const validRefreshToken: string = originalToken.refresh;

  // 2. Perform a successful refresh using the legitimate refresh token
  const refreshedAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: {
        refreshToken: validRefreshToken,
      } satisfies ICommunityPlatformAdminUserRefresh.IRequest,
    });
  typia.assert(refreshedAuthorized);

  // Identity invariants should be preserved across refresh
  TestValidator.equals(
    "admin id must remain the same after refresh",
    refreshedAuthorized.id,
    originalAuthorized.id,
  );
  TestValidator.equals(
    "admin username must remain the same after refresh",
    refreshedAuthorized.username,
    originalAuthorized.username,
  );
  TestValidator.equals(
    "admin email must remain the same after refresh",
    refreshedAuthorized.email,
    originalAuthorized.email,
  );
  TestValidator.equals(
    "is_super_admin flag must remain the same after refresh",
    refreshedAuthorized.is_super_admin,
    originalAuthorized.is_super_admin,
  );

  // 3. Build an obviously invalid/forged refresh token string
  const invalidRefreshToken: string = `invalid-${RandomGenerator.alphaNumeric(40)}`;

  // 4. Attempt to refresh with the invalid token and expect an HTTP error
  await TestValidator.httpError(
    "refresh with invalid token must be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies ICommunityPlatformAdminUserRefresh.IRequest,
      });
    },
  );
}

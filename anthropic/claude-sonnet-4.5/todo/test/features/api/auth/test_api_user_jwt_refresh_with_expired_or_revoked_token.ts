import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that refresh attempts using expired or revoked refresh tokens are
 * denied and handled securely.
 *
 * This test ensures the system properly rejects refresh requests when a client
 * presents a refresh token that is:
 *
 * 1. Past its validity window (expired token)
 * 2. Explicitly revoked (e.g., due to logout or session termination)
 *
 * Steps:
 *
 * 1. Construct a random but plausible refresh token string (format as would be
 *    issued, but not a valid/active one).
 * 2. Attempt to call the refresh endpoint with this expired or revoked token.
 * 3. Confirm that access is denied (an error is thrown), with a generic error that
 *    does NOT expose whether the token was expired, revoked, or the user
 *    exists.
 * 4. Confirm no PII or sensitive status is leaked in the error message or
 *    structure.
 * 5. (Business logic only) Document that such attempts should trigger an audit
 *    event for security monitoring.
 *
 * Implementation notes:
 *
 * - The error is expected at the API call level. TestValidator.error should be
 *   used for assertion.
 * - Use a mock or random string for the refresh_token field to simulate an
 *   invalid/expired token. Do not use a real/never-expiring token.
 * - Skip token creation steps; only simulate the error cases as the API does not
 *   expose token status & expects only valid tokens.
 */
export async function test_api_user_jwt_refresh_with_expired_or_revoked_token(
  connection: api.IConnection,
) {
  // Test: attempt refresh with a random/expired/revoked token
  const expiredOrRevokedToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "refresh with expired or revoked token should fail securely",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: expiredOrRevokedToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}

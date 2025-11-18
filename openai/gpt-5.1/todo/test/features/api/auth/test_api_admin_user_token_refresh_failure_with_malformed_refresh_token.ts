import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Verify that admin refresh endpoint rejects malformed or tampered refresh
 * tokens.
 *
 * Business intent:
 *
 * - The /auth/adminUser/refresh endpoint must be robust against structurally
 *   invalid or garbage refresh_token values that cannot map to any
 *   todo_app_adminuser_sessions row.
 * - When such an invalid token is provided, the backend should respond with an
 *   error (likely an HttpError surfaced by SDK) and MUST NOT issue a new
 *   ITodoAppAdminUser.IAuthorized payload.
 * - Error responses should be generic and not leak internal validation details
 *   (signature errors, parsing stack traces, etc.). From the E2E perspective,
 *   we validate only that an error occurs, not its exact content or status.
 *
 * Constraints from available SDK:
 *
 * - Only api.functional.auth.adminUser.refresh is provided; no login endpoint or
 *   session listing/inspection APIs are available in this test context.
 * - Therefore, we cannot reliably create or inspect real sessions, nor can we
 *   assert on database state like absence of new rows. Instead, we focus on
 *   runtime behavior: invalid inputs must fail and never produce an
 *   ITodoAppAdminUser.IAuthorized output.
 * - The refresh function signature requires a body of type
 *   ITodoAppAdminUser.IRefresh with a non-empty refresh_token string.
 *
 * Test strategy (single function):
 *
 * 1. Construct a clearly malformed refresh token string that still satisfies the
 *    DTO type (non-empty string), for example a short random alphabetic string
 *    that is unlikely to match any real token.
 * 2. Call api.functional.auth.adminUser.refresh with this malformed token.
 * 3. Use TestValidator.error to assert that the call fails (throws), indicating
 *    that the backend properly rejects invalid tokens.
 * 4. Optionally, repeat the test with another style of token (e.g. a long random
 *    noise string) to ensure that different malformed shapes are also rejected;
 *    however, all are structurally just strings at the DTO level.
 * 5. We do NOT:
 *
 *    - Assert on HTTP status codes,
 *    - Inspect HttpError.message contents,
 *    - Inspect or manipulate connection.headers,
 *    - Attempt to validate database side-effects.
 */
export async function test_api_admin_user_token_refresh_failure_with_malformed_refresh_token(
  connection: api.IConnection,
) {
  // Helper to build a short malformed token that still satisfies MinLength<1>
  const malformedTokenShort: string = RandomGenerator.alphabets(8);

  // 1. Refresh with a short, obviously invalid token string.
  await TestValidator.error(
    "refresh rejects short malformed token",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          refresh_token: malformedTokenShort,
        } satisfies ITodoAppAdminUser.IRefresh,
      });
    },
  );

  // 2. Refresh with a longer random noise token, still structurally just a
  //    string but highly unlikely to be a valid session reference.
  const malformedTokenLong: string = RandomGenerator.alphaNumeric(128);

  await TestValidator.error(
    "refresh rejects long random malformed token",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          refresh_token: malformedTokenLong,
        } satisfies ITodoAppAdminUser.IRefresh,
      });
    },
  );

  // 3. Refresh with a token that looks like a UUID but should not correspond
  //    to any real session. This mimics a structurally plausible but unknown
  //    token. From the API contract perspective it is still just a string; the
  //    backend must apply its own lookup and reject if no session matches.
  const malformedTokenUuidLike: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "refresh rejects uuid-like but unknown token",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          refresh_token: malformedTokenUuidLike,
        } satisfies ITodoAppAdminUser.IRefresh,
      });
    },
  );
}

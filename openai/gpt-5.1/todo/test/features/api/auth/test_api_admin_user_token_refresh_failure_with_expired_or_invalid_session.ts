import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that admin token refresh fails on an invalid/unauthorized context
 * and does not yield a new authorized session.
 *
 * Business intent (adapted to available APIs):
 *
 * - The backend should not issue new administrative JWT tokens when a refresh
 *   request is made without a valid authenticated or session context.
 * - A refresh attempt using an arbitrary opaque `refresh_token` value, when
 *   performed from a connection that does not carry any previously established
 *   session, must result in an HTTP error rather than a successful
 *   `ITodoAppAdminUser.IAuthorized` response.
 *
 * Concrete test steps:
 *
 * 1. Prepare a baseline connection that represents a normal admin client.
 * 2. Clone the baseline connection into an `unauthConn` that has an empty
 *    `headers` object, representing a client without any active admin session
 *    or Authorization header.
 * 3. Construct a syntactically valid `ITodoAppAdminUser.IRefresh` request body by
 *    generating a random non-empty `refresh_token` string.
 * 4. Call `api.functional.auth.adminUser.refresh` using `unauthConn` and the
 *    constructed body, and assert via `TestValidator.httpError` that the call
 *    fails with an HTTP error (indicating that refresh is not allowed in this
 *    context).
 * 5. Optionally repeat the failure attempt on `unauthConn` to ensure consistent
 *    behavior across multiple invalid refresh calls.
 */
export async function test_api_admin_user_token_refresh_failure_with_expired_or_invalid_session(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated clone connection with empty headers.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Build a syntactically valid refresh body with an opaque token string.
  const refreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(32),
  } satisfies ITodoAppAdminUser.IRefresh;

  // 3. Expect refresh to fail on unauthenticated connection.
  await TestValidator.httpError(
    "admin refresh must fail without valid session context",
    [400, 401, 403, 404, 422],
    async () => {
      // This call is expected to throw HttpError, not return normally.
      await api.functional.auth.adminUser.refresh(unauthConn, {
        body: refreshBody,
      });
    },
  );

  // 4. Repeat the invalid refresh attempt to verify consistent failure.
  await TestValidator.httpError(
    "repeated invalid admin refresh must continue to fail",
    [400, 401, 403, 404, 422],
    async () => {
      await api.functional.auth.adminUser.refresh(unauthConn, {
        body: refreshBody,
      });
    },
  );
}

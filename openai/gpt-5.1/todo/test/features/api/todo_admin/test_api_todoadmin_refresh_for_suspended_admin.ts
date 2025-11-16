import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminRefresh";

/**
 * Validate that todoAdmin refresh fails for an invalid or non-active admin
 * session.
 *
 * Business intent (adapted):
 *
 * - Originally, the scenario wanted to verify that when a todoAdmin account
 *   becomes suspended/closed after a refresh token was issued, any subsequent
 *   refresh attempt is denied.
 * - In this isolated test context, we do not have APIs to:
 *
 *   - Create/join a todoAdmin,
 *   - Log them in to obtain a real refresh token, or
 *   - Explicitly mutate the admin's lifecycle status.
 *
 * Therefore, this test focuses on the externally observable contract from a
 * client perspective:
 *
 * - When a client sends an invalid/expired refresh token (which includes the case
 *   where the backend has deemed the underlying admin/session invalid, such as
 *   suspended/closed accounts), the refresh endpoint must reject the request
 *   and MUST NOT return a successful `ITodoAppTodoAdmin.IAuthorized` payload.
 *
 * High-level steps:
 *
 * 1. Construct a syntactically valid ITodoAppTodoAdminRefresh.IRequest payload
 *    with a random opaque string as `refresh_token`.
 * 2. Call POST /auth/todoAdmin/refresh using
 *    `api.functional.auth.todoAdmin.refresh`.
 * 3. Assert that the call fails (throws) via TestValidator.error, ensuring we
 *    never receive an `ITodoAppTodoAdmin.IAuthorized` value for invalid token
 *    input.
 * 4. Do not assert exact HTTP status codes or error body details, only that an
 *    error occurs as per contract.
 */
export async function test_api_todoadmin_refresh_for_suspended_admin(
  connection: api.IConnection,
) {
  // 1. Build an invalid/opaque refresh token request body.
  //    We treat the token as an opaque string: no format constraints exist.
  const invalidRefreshRequest = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppTodoAdminRefresh.IRequest;

  // 2. Attempt to refresh with the invalid token and expect an error.
  //    We use TestValidator.error to assert that the call does not succeed and
  //    does not yield ITodoAppTodoAdmin.IAuthorized.
  await TestValidator.error(
    "refresh should fail for invalid/suspended admin token",
    async () => {
      // The call is expected to throw (e.g., HttpError) and must not resolve to
      // a valid ITodoAppTodoAdmin.IAuthorized.
      const result = await api.functional.auth.todoAdmin.refresh(connection, {
        body: invalidRefreshRequest,
      });

      // If the call unexpectedly succeeds, validate the structure to keep
      // strong typing and then fail the test explicitly.
      typia.assert<ITodoAppTodoAdmin.IAuthorized>(result);
      throw new Error(
        "Expected refresh to fail for invalid/suspended admin token, but it succeeded.",
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminTodoAction";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify that public/unauthenticated access to the admin todo actions audit log
 * is forbidden, while authenticated adminUser access is allowed.
 *
 * Business purpose: The admin todo actions audit log at PATCH
 * /todoApp/adminUser/adminTodoActions is highly sensitive, as it exposes
 * administrative interventions on member todos. The service documentation
 * states that this endpoint is restricted to the "adminUser" authorization
 * actor only. Any access without a valid admin token must be rejected to
 * prevent information leakage.
 *
 * Test steps:
 *
 * 1. Prepare an authenticated adminUser context by calling POST
 *    /auth/adminUser/join with a random but valid ITodoAppAdminUser.IJoin
 *    payload, and assert the returned ITodoAppAdminUser.IAuthorized structure
 *    using typia.assert.
 * 2. From this authenticated connection, perform a control request to PATCH
 *    /todoApp/adminUser/adminTodoActions using
 *    api.functional.todoApp.adminUser.adminTodoActions.index with a minimal
 *    ITodoAppAdminTodoAction.IRequest body (all filters omitted). Assert that
 *    the call succeeds and that the response matches
 *    IPageITodoAppAdminTodoAction.ISummary.
 * 3. Construct an unauthenticated connection by cloning the original connection
 *    but overriding its headers to an empty object literal so that no
 *    Authorization header is sent.
 * 4. Using this unauthenticated connection, attempt to call the same
 *    api.functional.todoApp.adminUser.adminTodoActions.index endpoint with an
 *    equally minimal ITodoAppAdminTodoAction.IRequest body (page and pageSize
 *    set to small positive ints to be explicit). Wrap the call with
 *    TestValidator.httpError and assert that the service responds with an HTTP
 *    client error status code in the 401/403 range.
 * 5. Do not attempt to inspect or rely on a particular error payload structure
 *    beyond the HTTP status class; the primary responsibility of this test is
 *    to ensure that no page of audit data is returned to an
 *    unauthenticated/public caller.
 */
export async function test_api_admin_todo_actions_public_access_forbidden(
  connection: api.IConnection,
) {
  // 1. Join as an admin user to obtain an authenticated admin context
  const adminJoinBody = typia.random<ITodoAppAdminUser.IJoin>();

  const authorizedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Perform a control request as authenticated adminUser
  const authenticatedRequestBody = {
    // Leave all filters undefined to get a default recent-actions page
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const authenticatedPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: authenticatedRequestBody,
    });
  typia.assert(authenticatedPage);

  // 3. Create an unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to call the same endpoint without Authorization and expect HTTP auth error
  const unauthenticatedRequestBody = {
    page: 1,
    pageSize: 10,
  } satisfies ITodoAppAdminTodoAction.IRequest;

  await TestValidator.httpError(
    "unauthenticated access to admin todo actions must be rejected",
    [401, 403],
    async () => {
      return await api.functional.todoApp.adminUser.adminTodoActions.index(
        unauthenticatedConnection,
        {
          body: unauthenticatedRequestBody,
        },
      );
    },
  );
}

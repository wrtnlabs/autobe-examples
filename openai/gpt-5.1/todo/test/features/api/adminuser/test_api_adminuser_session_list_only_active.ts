import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";

/**
 * Validate that an authenticated admin user can list only currently active
 * sessions.
 *
 * Business goal
 *
 * - Security tooling must be able to retrieve a clean list of active admin
 *   sessions for monitoring and potential force-logout features.
 * - The only_active flag on the session search endpoint must correctly filter
 *   based on expired_at semantics: only sessions where expired_at is null
 *   should be returned when only_active=true.
 *
 * Test flow
 *
 * 1. Join an admin user via POST /auth/adminUser/join.
 *
 *    - Use ITodoAppAdminUser.IJoin for the request body.
 *    - Receive ITodoAppAdminUser.IAuthorized, which also attaches the access token
 *         into connection headers automatically via the SDK.
 * 2. (Implicit) The join flow must have created at least one active admin session
 *    for this admin user.
 * 3. Call PATCH /todoApp/adminUser/adminUsers/{adminUserId}/sessions via
 *    api.functional.todoApp.adminUser.adminUsers.sessions.index with:
 *
 *    - AdminUserId = authorized.id from the join result.
 *    - Body: ITodoAppAdminuserSession.IRequest with page = 1, limit = 20,
 *         from_created_at = null, to_created_at = null, only_active = true,
 *         sort_created_at_desc = true.
 * 4. Assert the response type using typia.assert as
 *    IPageITodoAppAdminuserSession.ISummary.
 * 5. Validate business rules:
 *
 *    - Pagination.limit is >= data.length and pagination.current is 1.
 *    - Every ITodoAppAdminuserSession.ISummary in data has:
 *
 *         - Todo_app_adminuser_id equal to the joined admin user id.
 *         - Expired_at === null (active session).
 *
 * Error conditions are not the focus here; we only validate the success path
 * and the correctness of only_active filtering.
 */
export async function test_api_adminuser_session_list_only_active(
  connection: api.IConnection,
) {
  // 1. Join an admin user to create an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Call the sessions listing endpoint with only_active=true
  const requestBody = {
    page: 1,
    limit: 20,
    from_created_at: null,
    to_created_at: null,
    only_active: true,
    sort_created_at_desc: true,
  } satisfies ITodoAppAdminuserSession.IRequest;

  const page: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: authorized.id,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 3. Basic pagination sanity checks
  TestValidator.equals(
    "pagination current page must be 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit must be >= data length",
    page.pagination.limit >= page.data.length,
  );

  // 4. Ensure all sessions belong to this admin user and are active
  for (const session of page.data) {
    TestValidator.equals(
      "session belongs to the joined admin user",
      session.todo_app_adminuser_id,
      authorized.id,
    );

    TestValidator.equals(
      "only_active flag must return sessions with expired_at === null",
      session.expired_at,
      null,
    );
  }
}

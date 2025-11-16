import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test retrieving a paginated list of administrator sessions with basic
 * pagination parameters.
 *
 * This test validates that an administrator can successfully retrieve their own
 * session history with proper pagination controls. The test creates an admin
 * account, authenticates to generate at least one session, then retrieves the
 * session list using pagination parameters (page=1, limit=10).
 *
 * Verification steps:
 *
 * 1. Create a new administrator account
 * 2. Authenticate to establish session context
 * 3. Retrieve sessions with pagination parameters
 * 4. Validate pagination metadata (current, limit, records, pages)
 * 5. Confirm session data contains required fields
 * 6. Verify sessions belong to the authenticated admin
 */
export async function test_api_admin_session_list_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve paginated session list
  const sessionRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoListAdminSession.IRequest;

  const sessionPage: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: sessionRequest,
    });
  typia.assert(sessionPage);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    sessionPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "page limit should be 10",
    sessionPage.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "total records should be at least 1",
    sessionPage.pagination.records >= 1,
  );

  TestValidator.predicate(
    "total pages should be at least 1",
    sessionPage.pagination.pages >= 1,
  );

  // Step 4: Validate session data array
  TestValidator.predicate(
    "session data array should not be empty",
    sessionPage.data.length > 0,
  );

  TestValidator.predicate(
    "session data should not exceed limit",
    sessionPage.data.length <= 10,
  );

  // Step 5: Verify all sessions belong to the authenticated admin
  for (const session of sessionPage.data) {
    TestValidator.equals(
      "session should belong to authenticated admin",
      session.todo_list_admin_id,
      admin.id,
    );
  }
}

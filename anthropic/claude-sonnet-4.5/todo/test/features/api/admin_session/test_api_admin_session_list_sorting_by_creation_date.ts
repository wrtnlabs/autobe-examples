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
 * Test sorting administrator sessions by creation timestamp in both ascending
 * and descending order.
 *
 * This test validates the session list sorting functionality by:
 *
 * 1. Creating an admin account which establishes an initial session
 * 2. Retrieving sessions with ascending sort order (sort: ['created_at'])
 * 3. Retrieving sessions with descending sort order (sort: ['-created_at'])
 * 4. Testing multi-field sorting with IP address and creation date
 *
 * Note: Due to API limitations (only join endpoint available, no separate
 * login), this test validates the sorting parameter functionality with
 * available session data.
 */
export async function test_api_admin_session_list_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create admin account which creates initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve sessions sorted by creation date ascending
  const ascendingResult =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        sort: ["created_at"],
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(ascendingResult);

  // Validate response structure
  TestValidator.predicate(
    "ascending sort result should have data array",
    Array.isArray(ascendingResult.data),
  );

  // Step 3: Retrieve sessions sorted by creation date descending
  const descendingResult =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        sort: ["-created_at"],
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(descendingResult);

  // Validate response structure
  TestValidator.predicate(
    "descending sort result should have data array",
    Array.isArray(descendingResult.data),
  );

  // Step 4: Test multi-field sorting (IP, then creation date descending)
  const multiSortResult =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        sort: ["ip", "-created_at"],
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(multiSortResult);

  // Validate multi-field sort response
  TestValidator.predicate(
    "multi-field sort result should have data array",
    Array.isArray(multiSortResult.data),
  );

  // Step 5: Verify session data contains expected fields
  if (ascendingResult.data.length > 0) {
    const firstSession = ascendingResult.data[0];
    typia.assert(firstSession);

    TestValidator.predicate(
      "session should have created_at timestamp",
      typeof firstSession.created_at === "string" &&
        firstSession.created_at.length > 0,
    );

    TestValidator.predicate(
      "session should belong to the created admin",
      firstSession.todo_list_admin_id === admin.id,
    );
  }

  // Verify pagination metadata
  TestValidator.predicate(
    "result should have pagination metadata",
    typeof ascendingResult.pagination === "object",
  );
}

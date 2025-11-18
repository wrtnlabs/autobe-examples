import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate the retrieval of filtered and paginated list of Todo List
 * administrators.
 *
 * This test verifies admin authentication via join operation, then performs
 * multiple queries to the /todoList/admin/todoListAdmins endpoint with various
 * filter parameters including email substring, status, and creation/update date
 * ranges.
 *
 * Steps:
 *
 * 1. Authenticate as admin using join operation to gain necessary authorization.
 * 2. Query the todo list administrators without filters to test pagination
 *    defaults.
 * 3. Query the list filtered by partial email matching.
 * 4. Query the list filtered by status.
 * 5. Query the list filtered by creation and update date ranges.
 * 6. Validate response data types and properties with typia.assert.
 * 7. Validate pagination information is consistent and logical.
 * 8. Confirm filtering results are consistent with parameters.
 */
export async function test_api_todo_list_admin_list_with_authentication(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "secretpassword";
  const createBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(admin);
  TestValidator.predicate(
    "admin token exists",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Query list with no filters (pagination defaults)
  const emptyFilter: ITodoListAdmin.IRequest = {};
  const pageDefault: IPageITodoListAdmin.ISummary =
    await api.functional.todoList.admin.todoListAdmins.index(connection, {
      body: emptyFilter,
    });
  typia.assert(pageDefault);
  TestValidator.predicate(
    "pagination current page equal or greater than 1",
    pageDefault.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    pageDefault.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pageDefault.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    pageDefault.pagination.records >= 0,
  );
  TestValidator.predicate(
    "returned data count less or equal limit",
    pageDefault.data.length <= pageDefault.pagination.limit,
  );

  // 3. Query filtering by partial email substring
  // Extract a part of adminEmail to filter
  const emailFilter = adminEmail.substring(1, Math.min(7, adminEmail.length));
  const emailFilterBody: ITodoListAdmin.IRequest = {
    search_email: emailFilter,
  };
  const pageFilteredByEmail: IPageITodoListAdmin.ISummary =
    await api.functional.todoList.admin.todoListAdmins.index(connection, {
      body: emailFilterBody,
    });
  typia.assert(pageFilteredByEmail);
  for (const adminSummary of pageFilteredByEmail.data) {
    TestValidator.predicate(
      `admin email contains filter substring: ${emailFilter}`,
      adminSummary.email.includes(emailFilter),
    );
  }

  // 4. Query filtering by status (assuming statuses like 'active')
  // Since schema does not specify allowed status values, use "active" reliably
  const statusFilter: ITodoListAdmin.IRequest = { status: "active" };
  const pageFilteredByStatus: IPageITodoListAdmin.ISummary =
    await api.functional.todoList.admin.todoListAdmins.index(connection, {
      body: statusFilter,
    });
  typia.assert(pageFilteredByStatus);
  // We have no schema property to check status on summaries; must skip direct validation

  // 5. Query filtering by creation and update date range
  // Use ISO strings with realistic range
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: ITodoListAdmin.IRequest = {
    created_at_from: weekAgo.toISOString(),
    created_at_to: now.toISOString(),
    updated_at_from: weekAgo.toISOString(),
    updated_at_to: now.toISOString(),
  };
  const pageFilteredByDate: IPageITodoListAdmin.ISummary =
    await api.functional.todoList.admin.todoListAdmins.index(connection, {
      body: dateRangeFilter,
    });
  typia.assert(pageFilteredByDate);
  for (const adminSummary of pageFilteredByDate.data) {
    const createdAt = new Date(adminSummary.created_at);
    const updatedAt = new Date(adminSummary.updated_at);
    TestValidator.predicate(
      `created_at within range ${dateRangeFilter.created_at_from} - ${dateRangeFilter.created_at_to}`,
      createdAt >= weekAgo && createdAt <= now,
    );
    TestValidator.predicate(
      `updated_at within range ${dateRangeFilter.updated_at_from} - ${dateRangeFilter.updated_at_to}`,
      updatedAt >= weekAgo && updatedAt <= now,
    );
  }
}

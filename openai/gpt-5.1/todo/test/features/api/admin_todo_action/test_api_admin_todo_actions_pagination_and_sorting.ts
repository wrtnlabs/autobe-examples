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
 * Validate pagination and created_at-based sorting for admin todo actions
 * search.
 *
 * Business goal
 *
 * - Ensure that the admin audit log endpoint for todo actions returns
 *   deterministic, correctly paginated, and properly sorted data when queried
 *   by an authenticated admin user.
 * - Prove that page/limit are reflected in the pagination block and that sortBy +
 *   sortDirection are respected for created_at ordering.
 *
 * Covered workflow
 *
 * 1. Register a new admin user through POST /auth/adminUser/join and rely on the
 *    SDK to attach the access token into the connection headers.
 * 2. Call PATCH /todoApp/adminUser/adminTodoActions with a small pageSize (e.g.,
 *    5) and page=1, sortBy="created_at", sortDirection="desc".
 * 3. Assert that the response structure matches
 *    IPageITodoAppAdminTodoAction.ISummary and that pagination metadata
 *    reflects the input values (pagination.current, pagination.limit).
 * 4. Assert that data items (if two or more exist) are ordered in descending
 *    created_at order.
 * 5. Call the same endpoint again with page=2 and identical pageSize and sorting
 *    options.
 * 6. Assert that pagination.current is 2 and that no overlapping records appear
 *    between page 1 and page 2 (by comparing ids).
 * 7. Issue an additional call with sortDirection="asc" and the same pageSize and
 *    page=1, confirming that created_at order is ascending.
 *
 * Notes
 *
 * - This endpoint is read-only; the test does not create admin todo actions
 *   themselves, but relies on existing fixture data or simulator-generated data
 *   when connection.simulate is true.
 * - The test must remain robust even when the total record count is smaller than
 *   the chosen pageSize by guarding comparisons on data.length.
 */
export async function test_api_admin_todo_actions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain an authenticated connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Common page size for tests.
  const pageSize = 5;

  // 2. Request first page with desc sorting by created_at.
  const firstRequestBody = {
    page: 1,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const firstPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: firstRequestBody,
    });
  typia.assert(firstPage);

  // 3. Basic pagination assertions for first page.
  TestValidator.equals(
    "first page: pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page: pagination limit should equal requested pageSize",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "first page: data length must be <= pageSize",
    firstPage.data.length <= pageSize,
  );

  // 4. Verify descending created_at ordering when at least two items exist.
  if (firstPage.data.length >= 2) {
    for (let i = 1; i < firstPage.data.length; i++) {
      const prev = firstPage.data[i - 1];
      const curr = firstPage.data[i];
      TestValidator.predicate(
        `first page: created_at should be non-increasing at index ${i}`,
        prev.created_at >= curr.created_at,
      );
    }
  }

  // 5. Request second page with same sorting and pageSize.
  const secondRequestBody = {
    page: 2,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const secondPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: secondRequestBody,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second page: pagination current page should be 2",
    secondPage.pagination.current,
    2,
  );

  // Only check non-overlap when both pages have at least one record.
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const firstIds = new Set(firstPage.data.map((it) => it.id));
    const hasOverlap = secondPage.data.some((it) => firstIds.has(it.id));
    TestValidator.predicate(
      "second page: there should be no overlapping ids with first page",
      hasOverlap === false,
    );
  }

  // 6. Request first page again but with ascending sort direction.
  const ascRequestBody = {
    page: 1,
    pageSize,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const ascPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: ascRequestBody,
    });
  typia.assert(ascPage);

  TestValidator.equals(
    "ascending sort: pagination current page should be 1",
    ascPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "ascending sort: pagination limit should equal requested pageSize",
    ascPage.pagination.limit,
    pageSize,
  );

  if (ascPage.data.length >= 2) {
    for (let i = 1; i < ascPage.data.length; i++) {
      const prev = ascPage.data[i - 1];
      const curr = ascPage.data[i];
      TestValidator.predicate(
        `ascending sort: created_at should be non-decreasing at index ${i}`,
        prev.created_at <= curr.created_at,
      );
    }
  }
}

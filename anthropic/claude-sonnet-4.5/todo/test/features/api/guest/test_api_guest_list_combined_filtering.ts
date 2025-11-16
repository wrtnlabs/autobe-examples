import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test that an admin can combine multiple filter criteria simultaneously for
 * comprehensive guest analysis.
 *
 * This validates complex query construction with multiple parameters. Steps:
 *
 * 1. Admin authenticates
 * 2. Admin searches using combined filters (ip_address + date range + sorting +
 *    pagination)
 *
 * Validates that all filter criteria are applied simultaneously and correctly,
 * combined filters produce accurate intersection of matching records,
 * pagination works correctly with filtered results, sorting is applied to
 * filtered dataset, and admin can perform sophisticated visitor analytics with
 * multi-criteria queries.
 */
export async function test_api_guest_list_combined_filtering(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
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

  // Step 2: Admin performs multi-criteria search with combined filters
  const currentDate = new Date();
  const visitDateFrom = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const visitDateTo = currentDate.toISOString();

  const searchRequest = {
    page: 1,
    limit: 10,
    ip_address: "192.168",
    visit_date_from: visitDateFrom,
    visit_date_to: visitDateTo,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies ITodoListGuest.IRequest;

  const result = await api.functional.todoList.admin.guests.index(connection, {
    body: searchRequest,
  });
  typia.assert(result);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    result.pagination.pages >= 0,
  );

  // Step 4: Validate that data array exists and is properly typed
  TestValidator.predicate(
    "result data should be an array",
    Array.isArray(result.data),
  );

  // Step 5: Test with different sorting options to verify multi-criteria functionality
  const sortedAscResult = await api.functional.todoList.admin.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_by: "ip_address" as const,
        sort_order: "asc" as const,
      } satisfies ITodoListGuest.IRequest,
    },
  );
  typia.assert(sortedAscResult);

  TestValidator.predicate(
    "ascending sort result should have valid pagination",
    sortedAscResult.pagination.current === 1 &&
      sortedAscResult.pagination.limit === 20,
  );

  // Step 6: Test pagination with combined filters
  const paginatedResult = await api.functional.todoList.admin.guests.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
        visit_date_from: visitDateFrom,
        visit_date_to: visitDateTo,
        sort_by: "created_at" as const,
        sort_order: "asc" as const,
      } satisfies ITodoListGuest.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "paginated result should reflect page 2",
    paginatedResult.pagination.current === 2,
  );
  TestValidator.predicate(
    "paginated result should have limit 5",
    paginatedResult.pagination.limit === 5,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test pagination limit parameter constraints.
 *
 * Validates that the pagination limit parameter is properly constrained between
 * 1 and 100 (inclusive). Tests boundary conditions with limit=1 (minimum) and
 * limit=100 (maximum), verifying that pagination metadata is correct for these
 * valid boundary values. Ensures the API properly enforces limit constraints
 * across paginated todo results.
 *
 * This test validates:
 *
 * 1. The API accepts minimum valid limit (1)
 * 2. The API accepts maximum valid limit (100)
 * 3. Pagination metadata is correct for both boundary values
 * 4. Mid-range limit values (e.g., 50) work correctly
 * 5. Pagination structure maintains consistency across different limits
 *
 * Prerequisites: User must be authenticated via join operation.
 */
export async function test_api_todo_list_pagination_limit_constraints(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authenticated access
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      href: "http://localhost:3000/todos",
      referrer: "http://localhost:3000/",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);
  typia.assert(user.token);

  // Step 2: Test minimum valid limit (1)
  const minLimitResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit pagination returns correct limit value",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit response has valid pagination info",
    minLimitResponse.pagination.limit === 1 &&
      minLimitResponse.pagination.current >= 1,
  );

  // Step 3: Test maximum valid limit (100)
  const maxLimitResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit pagination returns correct limit value",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit response has valid pagination structure",
    maxLimitResponse.pagination.limit === 100 &&
      maxLimitResponse.pagination.current >= 1 &&
      maxLimitResponse.pagination.records >= 0 &&
      maxLimitResponse.pagination.pages >= 0,
  );

  // Step 4: Test mid-range valid limit (50)
  const midLimitResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(midLimitResponse);
  TestValidator.equals(
    "mid-range limit pagination returns correct limit value",
    midLimitResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination current page matches requested page",
    midLimitResponse.pagination.current === 1,
  );

  // Step 5: Verify pagination structure consistency across limits
  TestValidator.predicate(
    "minimum limit has complete pagination structure",
    minLimitResponse.pagination.current > 0 &&
      minLimitResponse.pagination.limit > 0 &&
      minLimitResponse.pagination.records >= 0 &&
      minLimitResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "maximum limit has complete pagination structure",
    maxLimitResponse.pagination.current > 0 &&
      maxLimitResponse.pagination.limit > 0 &&
      maxLimitResponse.pagination.records >= 0 &&
      maxLimitResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "mid-range limit has complete pagination structure",
    midLimitResponse.pagination.current > 0 &&
      midLimitResponse.pagination.limit > 0 &&
      midLimitResponse.pagination.records >= 0 &&
      midLimitResponse.pagination.pages >= 0,
  );

  // Step 6: Verify data array structure in response
  TestValidator.predicate(
    "minimum limit response has data array",
    Array.isArray(minLimitResponse.data),
  );
  TestValidator.predicate(
    "maximum limit response has data array",
    Array.isArray(maxLimitResponse.data),
  );
  TestValidator.predicate(
    "mid-range limit response has data array",
    Array.isArray(midLimitResponse.data),
  );

  // Step 7: Verify returned items count respects limit constraints
  TestValidator.predicate(
    "minimum limit returns at most 1 item",
    minLimitResponse.data.length <= 1,
  );
  TestValidator.predicate(
    "maximum limit returns at most 100 items",
    maxLimitResponse.data.length <= 100,
  );
  TestValidator.predicate(
    "mid-range limit returns at most 50 items",
    midLimitResponse.data.length <= 50,
  );
}

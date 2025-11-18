import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo list retrieval when no todos exist or when filters match no
 * results.
 *
 * This test validates the graceful handling of empty result sets in two
 * scenarios:
 *
 * 1. A newly created user with no todos in the database
 * 2. Search/filter criteria that match no existing todos
 *
 * Verifies that the API returns properly structured empty responses with
 * correct pagination metadata (records=0, pages=0) rather than errors or null
 * values. This ensures consistent response structure regardless of result set
 * size.
 *
 * Test workflow:
 *
 * 1. Create a new user account for testing
 * 2. Retrieve todo list immediately (empty database state)
 * 3. Verify empty data array and zero pagination metadata
 * 4. Use non-matching search criteria to test empty filter results
 * 5. Validate consistent empty response structure
 */
export async function test_api_todo_list_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: currentUrl,
      referrer: referrerUrl,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Retrieve todo list for newly created user (should be empty)
  const emptyListResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {} satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(emptyListResult);

  // Step 3: Validate empty result structure
  TestValidator.equals(
    "empty list should have zero records",
    emptyListResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty list should have zero pages",
    emptyListResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty list should have empty data array",
    emptyListResult.data.length,
    0,
  );
  TestValidator.predicate(
    "data should be array not null",
    Array.isArray(emptyListResult.data),
  );

  // Step 4: Test with search criteria that matches nothing
  const nonExistentSearchTerm = RandomGenerator.alphaNumeric(32);
  const searchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: nonExistentSearchTerm,
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 5: Validate search with no matches returns empty results
  TestValidator.equals(
    "search with no matches should have zero records",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search with no matches should have zero pages",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "search with no matches should have empty data array",
    searchResult.data.length,
    0,
  );

  // Step 6: Test with status filter that matches nothing (all incomplete when none exist)
  const statusFilterResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        status: "completed",
        page: 1,
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(statusFilterResult);

  // Step 7: Validate status filter with no matches
  TestValidator.equals(
    "status filter with no matches should have zero records",
    statusFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "status filter with no matches should have zero pages",
    statusFilterResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "status filter with no matches should have empty data array",
    statusFilterResult.data.length,
    0,
  );

  // Step 8: Validate pagination metadata consistency across all empty results
  TestValidator.predicate(
    "all empty results should have consistent structure",
    emptyListResult.pagination.current >= 0 &&
      searchResult.pagination.current >= 0 &&
      statusFilterResult.pagination.current >= 0,
  );
}

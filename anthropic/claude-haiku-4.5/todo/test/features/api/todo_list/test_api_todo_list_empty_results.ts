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
 * Test list retrieval when user has no todos or filter matches no results.
 *
 * This test validates proper handling of empty result sets by:
 *
 * 1. Creating a new user account with no initial todos
 * 2. Retrieving the todo list for the user with no todos
 * 3. Validating empty data array is returned
 * 4. Verifying pagination metadata shows 0 records and 0 pages
 * 5. Testing search functionality with no matching results
 * 6. Testing filter operations that match no todos
 *
 * The test ensures the API maintains response structure consistency and
 * properly handles edge cases where no data exists.
 */
export async function test_api_todo_list_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with no initial todos
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user created successfully",
    user.id !== null && user.id !== undefined,
  );

  // Step 2: Retrieve todo list for user with no todos (default pagination)
  const emptyListDefault: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(emptyListDefault);

  // Validate empty data array
  TestValidator.predicate(
    "empty data array returned for user with no todos",
    Array.isArray(emptyListDefault.data) && emptyListDefault.data.length === 0,
  );

  // Validate pagination shows 0 records and 0 pages
  TestValidator.equals(
    "pagination records count is zero",
    emptyListDefault.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is zero",
    emptyListDefault.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    emptyListDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    emptyListDefault.pagination.limit,
    20,
  );

  // Step 3: Test search functionality with no matching results
  const searchResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "nonexistent search term that will not match any todos",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search with no matches returns empty data array",
    Array.isArray(searchResults.data) && searchResults.data.length === 0,
  );
  TestValidator.equals(
    "search results pagination records is zero",
    searchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "search results pagination pages is zero",
    searchResults.pagination.pages,
    0,
  );

  // Step 4: Test completed filter with no matching results
  const completedFilter: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        completed: true,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedFilter);

  TestValidator.predicate(
    "completed filter on empty list returns empty data",
    Array.isArray(completedFilter.data) && completedFilter.data.length === 0,
  );
  TestValidator.equals(
    "completed filter pagination records is zero",
    completedFilter.pagination.records,
    0,
  );

  // Step 5: Test priority filter with no matching results
  const priorityFilter: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        priority: "high",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(priorityFilter);

  TestValidator.predicate(
    "priority filter on empty list returns empty data",
    Array.isArray(priorityFilter.data) && priorityFilter.data.length === 0,
  );
  TestValidator.equals(
    "priority filter pagination records is zero",
    priorityFilter.pagination.records,
    0,
  );

  // Step 6: Test with different pagination parameters
  const emptyListWithDifferentLimit: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(emptyListWithDifferentLimit);

  TestValidator.predicate(
    "different limit parameter on empty list returns empty data",
    Array.isArray(emptyListWithDifferentLimit.data) &&
      emptyListWithDifferentLimit.data.length === 0,
  );
  TestValidator.equals(
    "different limit pagination limit is 50",
    emptyListWithDifferentLimit.pagination.limit,
    50,
  );
  TestValidator.equals(
    "different limit pagination records is zero",
    emptyListWithDifferentLimit.pagination.records,
    0,
  );

  // Step 7: Test sorting parameters on empty list
  const emptyListWithSorting: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(emptyListWithSorting);

  TestValidator.predicate(
    "sorting on empty list returns empty data",
    Array.isArray(emptyListWithSorting.data) &&
      emptyListWithSorting.data.length === 0,
  );
  TestValidator.equals(
    "sorting pagination records is zero",
    emptyListWithSorting.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorting pagination pages is zero",
    emptyListWithSorting.pagination.pages,
    0,
  );
}

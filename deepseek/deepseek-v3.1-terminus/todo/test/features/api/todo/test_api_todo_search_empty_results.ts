import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMinimalTodoTodo";

/**
 * Test search scenarios that should return empty results, such as searching for
 * non-matching terms or applying filters that exclude all existing todos.
 * Validate that the system properly handles empty result sets with appropriate
 * pagination metadata and zero-count indications.
 */
export async function test_api_todo_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to access todo search functionality
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "ValidPassword123",
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test search with non-matching term that should return empty results
  const emptySearchResult = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: "NonExistentSearchTerm12345",
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(emptySearchResult);

  // Step 3: Validate empty result structure
  TestValidator.equals(
    "empty search results should have zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search results should have empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search results page should be 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search results limit should be 10",
    emptySearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty search results should have zero pages",
    emptySearchResult.pagination.pages,
    0,
  );

  // Step 4: Test filter that excludes all todos (completed filter when no todos exist)
  const filteredResult = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        completed: true,
        page: 1,
        limit: 5,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(filteredResult);

  // Step 5: Validate filtered empty result structure
  TestValidator.equals(
    "filtered results should have zero records",
    filteredResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered results should have empty data array",
    filteredResult.data.length,
    0,
  );
  TestValidator.equals(
    "filtered results page should be 1",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered results limit should be 5",
    filteredResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "filtered results should have zero pages",
    filteredResult.pagination.pages,
    0,
  );

  // Step 6: Test combination of non-matching search and filter
  const combinedResult = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: "AnotherNonExistentTerm",
        completed: false,
        page: 2,
        limit: 20,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(combinedResult);

  // Step 7: Validate combined empty result structure
  TestValidator.equals(
    "combined results should have zero records",
    combinedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined results should have empty data array",
    combinedResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined results page should be 2",
    combinedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined results limit should be 20",
    combinedResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "combined results should have zero pages",
    combinedResult.pagination.pages,
    0,
  );

  // Step 8: Test sorting with empty results
  const sortedEmptyResult = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: "NoMatchingTodos",
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(sortedEmptyResult);

  // Step 9: Validate sorted empty result structure
  TestValidator.equals(
    "sorted empty results should have zero records",
    sortedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted empty results should have empty data array",
    sortedEmptyResult.data.length,
    0,
  );
}

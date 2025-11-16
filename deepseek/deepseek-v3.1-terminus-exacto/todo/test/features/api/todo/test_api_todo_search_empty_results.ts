import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test search functionality when no todos match the specified criteria.
 *
 * This test validates that the todo search API correctly handles scenarios
 * where search criteria exclude all existing todo items. It creates a baseline
 * of todo items with specific attributes and then performs searches with
 * filters that intentionally don't match any of the created items, ensuring the
 * system returns proper empty results with correct pagination metadata.
 *
 * Step-by-step process:
 *
 * 1. Create a new user account and authenticate
 * 2. Create multiple todo items with specific content
 * 3. Execute search queries with non-matching criteria
 * 4. Validate empty results with proper pagination
 * 5. Test various restrictive filter scenarios
 */
export async function test_api_todo_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      password_hash: "hashed_password_placeholder",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create test todo items with specific content
  const todos = await ArrayUtil.asyncRepeat(3, async (index) => {
    const todo = await api.functional.todos.create(connection, {
      body: {
        title: `Test Todo ${index + 1}`,
        description: `This is test todo item number ${index + 1}`,
        due_date: new Date(
          Date.now() + 86400000 * (index + 1),
        ).toISOString() satisfies
          | (string & tags.Format<"date-time">)
          | undefined as (string & tags.Format<"date-time">) | undefined,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    return todo;
  });

  // Step 3: Execute search queries with filters that exclude all todos

  // Test 1: Search for non-existent content
  const searchResult1 = await api.functional.todos.search(connection, {
    body: {
      search: "nonexistent_keyword_that_does_not_exist_in_any_todo",
      page: 1,
      limit: 10,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(searchResult1);

  // Validate empty results with proper pagination
  TestValidator.equals(
    "search with completely non-existent keyword returns empty data",
    searchResult1.data,
    [],
  );
  TestValidator.equals(
    "pagination current page should be 1 for non-existent keyword search",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10 for non-existent keyword search",
    searchResult1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0 for non-existent keyword search",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0 for non-existent keyword search",
    searchResult1.pagination.pages,
    0,
  );

  // Test 2: Search with due date filter that excludes all todos
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const searchResult2 = await api.functional.todos.search(connection, {
    body: {
      due_before: pastDate satisfies
        | (string & tags.Format<"date-time">)
        | undefined as (string & tags.Format<"date-time">) | undefined,
      page: 1,
      limit: 5,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(searchResult2);

  // Validate empty results
  TestValidator.equals(
    "search with past due date filter returns empty data",
    searchResult2.data,
    [],
  );
  TestValidator.equals(
    "pagination current page should be 1 for past date search",
    searchResult2.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5 for past date search",
    searchResult2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "total records should be 0 for past date search",
    searchResult2.pagination.records,
    0,
  );

  // Test 3: Search with combination of filters that exclude all
  const searchResult3 = await api.functional.todos.search(connection, {
    body: {
      search: "completely_different_content_not_found_in_todos",
      due_after: new Date(Date.now() + 86400000 * 10).toISOString() satisfies
        | (string & tags.Format<"date-time">)
        | undefined as (string & tags.Format<"date-time">) | undefined,
      page: 1,
      limit: 20,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(searchResult3);

  // Validate empty results
  TestValidator.equals(
    "search with combination of non-matching filters returns empty data",
    searchResult3.data,
    [],
  );
  TestValidator.equals(
    "pagination current page should be 1 for combined filter search",
    searchResult3.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20 for combined filter search",
    searchResult3.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records should be 0 for combined filter search",
    searchResult3.pagination.records,
    0,
  );

  // Test 4: Search with empty criteria but high page number
  const searchResult4 = await api.functional.todos.search(connection, {
    body: {
      page: 100,
      limit: 10,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(searchResult4);

  // Validate empty results for out-of-range page
  TestValidator.equals(
    "search with high page number beyond data range returns empty data",
    searchResult4.data,
    [],
  );
  TestValidator.equals(
    "pagination current page should be 100 for high page search",
    searchResult4.pagination.current,
    100,
  );
  TestValidator.equals(
    "pagination limit should be 10 for high page search",
    searchResult4.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0 for high page search",
    searchResult4.pagination.records,
    0,
  );

  // Test 5: Search with impossible date range combination
  const searchResult5 = await api.functional.todos.search(connection, {
    body: {
      due_before: new Date(Date.now() - 86400000).toISOString() satisfies
        | (string & tags.Format<"date-time">)
        | undefined as (string & tags.Format<"date-time">) | undefined,
      due_after: new Date(Date.now() + 86400000).toISOString() satisfies
        | (string & tags.Format<"date-time">)
        | undefined as (string & tags.Format<"date-time">) | undefined,
      page: 1,
      limit: 15,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(searchResult5);

  // Validate empty results for impossible date range
  TestValidator.equals(
    "search with impossible date range returns empty data",
    searchResult5.data,
    [],
  );
  TestValidator.equals(
    "pagination current page should be 1 for impossible range search",
    searchResult5.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 15 for impossible range search",
    searchResult5.pagination.limit,
    15,
  );
  TestValidator.equals(
    "total records should be 0 for impossible range search",
    searchResult5.pagination.records,
    0,
  );
}

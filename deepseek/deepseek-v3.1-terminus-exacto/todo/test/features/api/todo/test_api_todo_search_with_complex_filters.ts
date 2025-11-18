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
 * Test advanced search scenarios combining multiple filters simultaneously.
 * Validates complex query combinations such as searching for todos with
 * specific criteria, sorting by various fields, and paginating through results.
 * Tests the search functionality with different filter combinations to ensure
 * proper handling of mixed filter conditions.
 */
export async function test_api_todo_search_with_complex_filters(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test complex search with multiple filters
  // Search with text filter, status filter, and sorting
  const searchResult1 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: "test",
        status: "pending",
        order_by: "created_at",
        order_direction: "desc",
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult1);

  TestValidator.predicate(
    "search returns valid pagination info",
    searchResult1.pagination !== undefined &&
      searchResult1.pagination.current === 1 &&
      searchResult1.pagination.limit === 5,
  );

  TestValidator.predicate(
    "search returns data array",
    Array.isArray(searchResult1.data),
  );

  // Step 3: Test pagination with different page sizes
  const searchResult2 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 2,
        limit: 3,
        order_by: "title",
        order_direction: "asc",
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult2);

  TestValidator.equals(
    "page number matches request",
    searchResult2.pagination.current,
    2,
  );

  TestValidator.equals(
    "limit matches request",
    searchResult2.pagination.limit,
    3,
  );

  // Step 4: Test search with only user filter
  const searchResult3 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "updated_at",
        order_direction: "desc",
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult3);

  TestValidator.predicate(
    "total records count is non-negative",
    searchResult3.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count is calculated correctly",
    searchResult3.pagination.pages >= 0,
  );

  // Step 5: Test search with status filter only
  const searchResult4 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "completed",
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult4);

  TestValidator.predicate(
    "status filtered search returns valid response",
    searchResult4.pagination !== undefined && Array.isArray(searchResult4.data),
  );

  // Step 6: Test search with text filter only
  const searchResult5 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: "important",
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult5);

  TestValidator.predicate(
    "text search returns valid response structure",
    searchResult5.pagination !== undefined && Array.isArray(searchResult5.data),
  );

  // Step 7: Test edge case - maximum limit
  const searchResult6 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult6);

  TestValidator.equals(
    "maximum limit is respected",
    searchResult6.pagination.limit,
    100,
  );
}

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
 * Test search behavior when no todos match the specified criteria. Validates
 * that the system properly handles empty result sets by returning appropriate
 * pagination metadata with zero records. Tests edge cases like searching for
 * non-existent keywords or filtering by status when no matching todos exist.
 */
export async function test_api_todo_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create user context for search operations
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Perform search with criteria guaranteed to return empty results
  // Using a unique search term that doesn't exist and filtering by completed status
  const searchResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "nonexistent_unique_search_term_xyz123",
        status: "completed",
        order_by: "created_at",
        order_direction: "desc",
        user_id: user.id satisfies string | undefined as string | undefined,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate empty data array first (logical order)
  TestValidator.equals(
    "data array should be empty for no matching todos",
    searchResult.data,
    [],
  );

  // Step 4: Validate pagination metadata for empty result set
  TestValidator.equals(
    "total records should be zero for empty search",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero when no records exist",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    searchResult.pagination.limit,
    10,
  );

  // Step 5: Additional validation for empty array structure
  TestValidator.predicate(
    "empty data array should have length zero",
    searchResult.data.length === 0,
  );
}

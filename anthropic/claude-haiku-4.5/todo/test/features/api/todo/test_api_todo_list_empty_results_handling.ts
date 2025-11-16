import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the search operation when query parameters match no todos.
 *
 * This test validates that the search API properly handles empty result sets by
 * returning a valid paginated response structure with empty data arrays,
 * correct pagination metadata, and success status. The test creates a user,
 * adds some todos to establish baseline data, then performs searches with
 * filters that intentionally match no results (non-existent titles, future date
 * ranges, etc.) to verify the API gracefully handles these scenarios.
 *
 * 1. Create and authenticate a new user account
 * 2. Create initial todos to establish search baseline
 * 3. Execute search with non-existent title filter
 * 4. Validate empty results with correct pagination structure
 * 5. Execute search with future date range filter
 * 6. Validate empty results and pagination metadata
 * 7. Execute search with past date range that excludes all todos
 * 8. Verify empty data array and zero records count
 */
export async function test_api_todo_list_empty_results_handling(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create initial todos to establish baseline data
  const existingTodos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const createdTodo = await api.functional.todoApp.user.todos.create(
        connection,
        {
          body: {
            title: `Important Task ${RandomGenerator.alphaNumeric(4)}`,
            description: RandomGenerator.paragraph(),
          } satisfies ITodoAppTodo.ICreate,
        },
      );
      typia.assert(createdTodo);
      return createdTodo;
    },
  );

  // 3. Execute search with non-existent title filter - should return empty results
  const emptySearchByTitle: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title: "NONEXISTENT_TITLE_12345",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(emptySearchByTitle);

  // 4. Validate empty results structure with correct pagination
  TestValidator.equals(
    "empty search by title returns empty data array",
    emptySearchByTitle.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero for empty search",
    emptySearchByTitle.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero when no records",
    emptySearchByTitle.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    emptySearchByTitle.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    emptySearchByTitle.pagination.limit,
    20,
  );

  // 5. Execute search with future date range - should return empty results
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureDateTime = futureDate.toISOString();

  const emptySearchByFutureDate: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        created_after: futureDateTime,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(emptySearchByFutureDate);

  // 6. Validate empty results and pagination metadata
  TestValidator.equals(
    "empty search by future date returns empty data array",
    emptySearchByFutureDate.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero for future date search",
    emptySearchByFutureDate.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination structure should be valid",
    emptySearchByFutureDate.pagination.current >= 0 &&
      emptySearchByFutureDate.pagination.limit >= 0 &&
      emptySearchByFutureDate.pagination.records >= 0 &&
      emptySearchByFutureDate.pagination.pages >= 0,
  );

  // 7. Execute search with past date range that excludes all todos
  const veryOldDate = new Date();
  veryOldDate.setFullYear(2000);
  const veryOldDateTime = veryOldDate.toISOString();

  const pastDateMax = new Date();
  pastDateMax.setFullYear(2001);
  const pastDateMaxTime = pastDateMax.toISOString();

  const emptySearchByPastDate: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        created_after: veryOldDateTime,
        created_before: pastDateMaxTime,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(emptySearchByPastDate);

  // 8. Verify empty data array and zero records count
  TestValidator.equals(
    "empty search by past date returns empty data array",
    emptySearchByPastDate.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero for past date range search",
    emptySearchByPastDate.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination should maintain correct structure with zero items",
    emptySearchByPastDate.pagination.pages === 0 &&
      emptySearchByPastDate.pagination.current >= 1,
  );

  // 9. Verify that search with empty string still returns proper structure
  const emptySearchString: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "ZZZZZZNONEXISTENTZZZZZ",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(emptySearchString);

  TestValidator.equals(
    "search by non-matching keyword returns empty data array",
    emptySearchString.data.length,
    0,
  );
}

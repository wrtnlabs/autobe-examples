import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodos } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodos";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodos } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodos";

/**
 * Test that the search and retrieval endpoint correctly handles the scenario
 * when no todos exist for the authenticated user.
 *
 * This test verifies that querying todos when the user has not created any
 * todos returns an empty results list with zero count rather than an error. It
 * validates that pagination metadata is still provided correctly (page 1, total
 * count 0), and that the response structure remains consistent. This validates
 * proper handling of the empty state in the user interface.
 *
 * **Test Steps:**
 *
 * 1. Create a new authenticated user account with no pre-existing todos
 * 2. Call the todos search endpoint with empty search request
 * 3. Verify the response contains empty data array and correct pagination
 * 4. Validate response structure matches IPageITodoAppTodos type
 * 5. Ensure no errors when retrieving todos for user with no todos
 */
export async function test_api_todos_empty_list_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new authenticated user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Pass${RandomGenerator.alphaNumeric(8)}!`;

  const userAccount: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(userAccount);
  typia.assert<string & tags.Format<"uuid">>(userAccount.id);

  // Step 2: Call the todos search endpoint with default/empty search request
  const todoResponse: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {} satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(todoResponse);

  // Step 3: Verify the response contains empty data array and correct pagination
  TestValidator.equals(
    "todo list should be empty",
    todoResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "data is empty array",
    Array.isArray(todoResponse.data),
  );

  // Step 4: Validate pagination metadata
  const pagination: IPage.IPagination = todoResponse.pagination;
  typia.assert(pagination);

  TestValidator.equals("current page should be 1", pagination.current, 1);
  TestValidator.predicate(
    "page limit should be positive",
    pagination.limit > 0,
  );
  TestValidator.equals("total records should be 0", pagination.records, 0);
  TestValidator.equals(
    "total pages should be 0 when no records",
    pagination.pages,
    0,
  );

  // Step 5: Verify response structure consistency
  TestValidator.predicate(
    "response structure has both pagination and data",
    todoResponse.pagination !== undefined && todoResponse.data !== undefined,
  );

  // Step 6: Test with explicit pagination parameters
  const todoResponseWithParams: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(todoResponseWithParams);

  TestValidator.equals(
    "empty list with explicit params",
    todoResponseWithParams.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page with explicit params",
    todoResponseWithParams.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records with explicit params",
    todoResponseWithParams.pagination.records,
    0,
  );
}

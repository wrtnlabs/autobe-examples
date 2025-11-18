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
 * Verifies searching todos with status and keyword filter, immediately after
 * registering a new user.
 *
 * 1. Register a user (POST /auth/user/join)
 * 2. Search todos with status filter ('pending') and assert empty result.
 * 3. Search todos with status and arbitrary keyword (e.g. 'meeting') and assert
 *    empty result.
 * 4. Confirm pagination metadata is valid: current page should be 1, zero records,
 *    total pages 0.
 *
 * This ensures no data leaks, correct query logic, and robust pagination for
 * new users without todos.
 */
export async function test_api_todo_search_with_status_and_keyword_filter(
  connection: api.IConnection,
) {
  // Register a new user
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(10) + "Z1";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // (Auth token is now set on connection)

  // Search todos with status filter only
  const searchStatusPending = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "pending",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchStatusPending);
  TestValidator.equals(
    "no todos for pending status",
    searchStatusPending.data.length,
    0,
  );
  TestValidator.equals(
    "current page is 1 for status filter",
    searchStatusPending.pagination.current,
    1,
  );
  TestValidator.equals(
    "zero records for new user",
    searchStatusPending.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages for new user",
    searchStatusPending.pagination.pages,
    0,
  );

  // Search todos with status + keyword
  const searchStatusKeyword = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "pending",
        q: "meeting",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchStatusKeyword);
  TestValidator.equals(
    "no todos for status+keyword",
    searchStatusKeyword.data.length,
    0,
  );
  TestValidator.equals(
    "current page is 1 for status+keyword",
    searchStatusKeyword.pagination.current,
    1,
  );
  TestValidator.equals(
    "zero records for keyword search",
    searchStatusKeyword.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for keyword search",
    searchStatusKeyword.pagination.pages,
    0,
  );
}

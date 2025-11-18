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
 * Test authenticated user searching and filtering their own todo list.
 *
 * 1. Register a new user to establish authentication context
 * 2. Since we cannot create todos (no create API), the list should be empty.
 * 3. Perform paginated search/filter API calls with various parameters:
 *
 *    - No filters
 *    - Completed: true
 *    - Completed: false
 *    - Search: random string
 *    - Include_deleted: true
 *    - Page: 1, 2, limit: 1, 10, 100
 * 4. Ensure all responses have empty data arrays and correct pagination fields.
 * 5. Assert the responses are strictly for the user, and error/edge cases like
 *    page overflow return empty data.
 */
export async function test_api_todo_list_search_and_filter_by_user(
  connection: api.IConnection,
) {
  // 1. Register user
  const email =
    RandomGenerator.name(1) +
    "_" +
    RandomGenerator.alphabets(8) +
    "@autobe-e2e.com";
  const password = RandomGenerator.alphaNumeric(12);
  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinResult);
  TestValidator.predicate(
    "token must be present",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );

  // 2. Search / filter with various combinations - expect empty result
  // Utility function to test index with a given request
  async function validateSearch(
    body: ITodoListTodo.IRequest,
    description: string,
  ) {
    const output = await api.functional.todoList.user.todos.index(connection, {
      body,
    });
    typia.assert(output);
    TestValidator.equals(
      description + " - pagination current page",
      output.pagination.current,
      (body.page ?? 1) satisfies number as number,
    );
    TestValidator.equals(
      description + " - pagination limit",
      output.pagination.limit,
      (body.limit ?? 100) satisfies number as number,
    );
    TestValidator.equals(
      description + " - records",
      output.pagination.records,
      0,
    );
    TestValidator.predicate(
      description + " - data is empty",
      Array.isArray(output.data) && output.data.length === 0,
    );
  }

  // Basic no-filter search
  await validateSearch({}, "no filter");
  // completed: true
  await validateSearch({ completed: true }, "completed: true");
  // completed: false
  await validateSearch({ completed: false }, "completed: false");
  // search: random string
  await validateSearch(
    { search: RandomGenerator.paragraph({ sentences: 2 }) },
    "search keyword",
  );
  // include_deleted: true
  await validateSearch({ include_deleted: true }, "include_deleted: true");
  // include_deleted: false (explicit)
  await validateSearch({ include_deleted: false }, "include_deleted: false");
  // custom paginations
  await validateSearch({ page: 1, limit: 1 }, "page 1, limit 1");
  await validateSearch({ page: 2, limit: 10 }, "page 2, limit 10");
  await validateSearch({ page: 1, limit: 100 }, "page 1, limit 100");
}

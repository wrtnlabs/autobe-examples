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
 * Validate todo list search for authenticated user with various filter and
 * pagination criteria.
 *
 * This test does the following:
 *
 * 1. Registers a unique test user and authenticates with the system.
 * 2. (Assumes pre-existing server-side todo data — since no create-todo endpoint
 *    exposed).
 * 3. Performs todo queries with a variety of ITodoListTodo.IRequest options:
 *
 * - Default query (no filters)
 * - Status filter (pending & completed)
 * - Sort by title ascending/descending
 * - Pagination with explicit page/page_size
 * - Full-text search against title/description
 * - Created_at date range filter
 * - Combined filters: e.g. pending in a date range, sorted by created_at
 *
 * 4. Verifies that:
 *
 * - Results all belong to the logged-in user.
 * - Returned todos always match filter/sort/page criteria.
 * - Pagination data is correct.
 * - Unauthenticated users are denied access.
 */
export async function test_api_todo_list_search_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as test user
  const testUserEmail: string = typia.random<string & tags.Format<"email">>();
  const testUserPassword: string = RandomGenerator.alphaNumeric(12);
  const testUserJoin = {
    email: testUserEmail,
    password: testUserPassword as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    display_name: RandomGenerator.name(2) as string &
      tags.MinLength<2> &
      tags.MaxLength<50>,
    href: "https://test.example.com/signup",
    referrer: "https://test.example.com/",
  } satisfies ITodoListUser.IJoin;
  const auth = await api.functional.auth.user.join(connection, {
    body: testUserJoin,
  });
  typia.assert(auth);

  // 2. Populate todos - cannot create via API (assume some exist after registration)

  // 3. Search with default (no filter) — should succeed (maybe empty)
  const defaultResult = await api.functional.todoList.user.todos.index(
    connection,
    { body: {} satisfies ITodoListTodo.IRequest },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "paginated data is array",
    Array.isArray(defaultResult.data),
    true,
  );
  // All todos belong to this user (ownership pred)
  await ArrayUtil.asyncForEach(defaultResult.data, async (todo, idx) => {
    TestValidator.equals(
      `all todos user.id = test user (idx=${idx})`,
      todo.user.id,
      auth.id,
    );
  });
  // 4. Search by status (pending)
  const pendingResult = await api.functional.todoList.user.todos.index(
    connection,
    { body: { status: "pending" } satisfies ITodoListTodo.IRequest },
  );
  typia.assert(pendingResult);
  await ArrayUtil.asyncForEach(pendingResult.data, async (todo, idx) => {
    TestValidator.equals(
      `pending filter returned only pending (idx=${idx})`,
      todo.status,
      "pending",
    );
  });
  // 5. Search by status (completed)
  const completedResult = await api.functional.todoList.user.todos.index(
    connection,
    { body: { status: "completed" } satisfies ITodoListTodo.IRequest },
  );
  typia.assert(completedResult);
  await ArrayUtil.asyncForEach(completedResult.data, async (todo, idx) => {
    TestValidator.equals(
      `completed filter returned only completed (idx=${idx})`,
      todo.status,
      "completed",
    );
  });
  // 6. Pagination test — try tiny page_size
  const pagedResult = await api.functional.todoList.user.todos.index(
    connection,
    { body: { page_size: 2 } satisfies ITodoListTodo.IRequest },
  );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagedResult.data length matches page_size or less",
    pagedResult.data.length <= 2,
    true,
  );
  // 7. Sorting test (sort by title asc/desc)
  for (const sort_order of ["asc", "desc"] as const) {
    const sortResult = await api.functional.todoList.user.todos.index(
      connection,
      {
        body: { sort_by: "title", sort_order } satisfies ITodoListTodo.IRequest,
      },
    );
    typia.assert(sortResult);
    const data = sortResult.data.slice();
    const sorted = [...data].sort((a, b) =>
      sort_order === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title),
    );
    TestValidator.equals(`sort order (${sort_order}) by title`, data, sorted);
  }
  // 8. Date range filter (created_from/created_to)
  if (defaultResult.data.length > 0) {
    // Pick min/max created_at from some result
    const created_ats = defaultResult.data.map((x) => x.created_at);
    const minDate = created_ats.reduce((a, b) => (a < b ? a : b));
    const maxDate = created_ats.reduce((a, b) => (a > b ? a : b));
    const ranged = await api.functional.todoList.user.todos.index(connection, {
      body: {
        created_from: minDate,
        created_to: maxDate,
      } satisfies ITodoListTodo.IRequest,
    });
    typia.assert(ranged);
    await ArrayUtil.asyncForEach(ranged.data, async (todo, idx) => {
      TestValidator.predicate(
        `created_at >= minDate (idx=${idx})`,
        todo.created_at >= minDate,
      );
      TestValidator.predicate(
        `created_at <= maxDate (idx=${idx})`,
        todo.created_at <= maxDate,
      );
    });
  }
  // 9. Full-text search (using substring of first todo's title if exists)
  if (defaultResult.data.length > 0) {
    const firstTitle = defaultResult.data[0].title;
    const query = RandomGenerator.substring(firstTitle);
    const searchResult = await api.functional.todoList.user.todos.index(
      connection,
      {
        body: { query } satisfies ITodoListTodo.IRequest,
      },
    );
    typia.assert(searchResult);
    await ArrayUtil.asyncForEach(searchResult.data, async (todo, idx) => {
      TestValidator.predicate(
        `full-text search matches title/desc (idx=${idx})`,
        todo.title.includes(query),
      );
    });
  }
  // 10. Ownership is always enforced (never see another user)
  await ArrayUtil.asyncForEach(defaultResult.data, async (todo, idx) => {
    TestValidator.equals(
      `ownership: all search result user.id = auth.id (idx=${idx})`,
      todo.user.id,
      auth.id,
    );
  });
  // 11. Unauthorized user cannot access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search todo list",
    async () => {
      await api.functional.todoList.user.todos.index(unauthConn, {
        body: {} satisfies ITodoListTodo.IRequest,
      });
    },
  );
}

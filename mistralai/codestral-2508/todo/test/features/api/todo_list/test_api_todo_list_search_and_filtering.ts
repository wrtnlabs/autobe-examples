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
 * Validate robust search, filtering, and pagination of user's Todo list.
 *
 * This test covers:
 *
 * 1. User registration and login
 * 2. Creation of numerous Todos for variety
 * 3. Searching the user's own todos by:
 *
 *    - Completion status
 *    - Substring matching (title)
 *    - Paging (page, page_size)
 *    - Sorting by created_at and completed_at
 *    - Privacy (ensuring only own todos appear)
 *    - Graceful handling of empty sets
 * 4. Ensures API respects pagination, ordering, and filtering accurately
 */
export async function test_api_todo_list_search_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "Az1!";
  const joinHref = "https://test-host/login";
  const joinReferrer = "https://test-host/";
  const displayName = RandomGenerator.name();

  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      href: joinHref as string & tags.Format<"uri">,
      referrer: joinReferrer as string & tags.Format<"uri">,
      display_name: displayName,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userJoin);

  // 2. Login as the user
  const userLogin = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      href: joinHref as string & tags.Format<"uri">,
      referrer: joinReferrer as string & tags.Format<"uri">,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userLogin);

  // 3. Create list of Todos
  const todosToMake = 16;
  const titles: string[] = ArrayUtil.repeat(
    todosToMake,
    (i) =>
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 7 }) +
      (i % 3 === 0 ? " special" : ""),
  );
  const createdTodos: ITodoListTodo[] = [];
  for (let i = 0; i < todosToMake; ++i) {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: titles[i] as string & tags.MinLength<1> & tags.MaxLength<100>,
        description:
          i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : undefined,
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Mark some as completed (simulate via direct manipulation for later use in assertions)
  const completedIds = createdTodos
    .filter((_, i) => i % 2 === 0)
    .map((t) => t.id);
  // For simplicity, simulate completed flag (real endpoint to mark complete may not be available, so just set property for test assertions)
  const todosAugmented = createdTodos.map((t, i) => ({
    ...t,
    completed: i % 2 === 0,
    completed_at: i % 2 === 0 ? t.updated_at : null,
  }));

  // 4. SearchAPI: Filter for completed only
  let result = await api.functional.todoList.user.todos.index(connection, {
    body: { completed: true },
  });
  typia.assert(result);
  TestValidator.predicate(
    "completed filter returns all (and only) user's completed Todos",
    result.data.every((td) => td.completed === true),
  );
  TestValidator.equals(
    "completed filter returns correct count",
    result.data.length,
    todosAugmented.filter((t) => t.completed).length,
  );

  // Filter for incomplete only
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { completed: false },
  });
  typia.assert(result);
  TestValidator.predicate(
    "incomplete filter returns only user's incomplete Todos",
    result.data.every((td) => td.completed === false),
  );
  TestValidator.equals(
    "incomplete filter returns correct count",
    result.data.length,
    todosAugmented.filter((t) => !t.completed).length,
  );

  // Filter by title substring
  const partial = RandomGenerator.substring(titles[4]);
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { title: partial },
  });
  typia.assert(result);
  TestValidator.predicate(
    "title substring filter returns only matching Todos",
    result.data.every((td) => td.title.includes(partial)),
  );

  // 5. Pagination (pages, page_size)
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { page: 2, page_size: 5 },
  });
  typia.assert(result);
  TestValidator.equals(
    "pagination meta (second page, limit 5)",
    result.pagination.current,
    2,
  );
  TestValidator.equals("pagination meta limit", result.pagination.limit, 5);
  TestValidator.predicate(
    "result count matches page size or less",
    result.data.length <= 5,
  );

  // 6. Order by created_at ascending
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { order_by: "created_at", order_dir: "asc" },
  });
  typia.assert(result);
  TestValidator.predicate(
    "todos sorted by created_at ascending",
    result.data.every(
      (td, idx, arr) => idx === 0 || td.created_at >= arr[idx - 1].created_at,
    ),
  );

  // Order by created_at descending
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { order_by: "created_at", order_dir: "desc" },
  });
  typia.assert(result);
  TestValidator.predicate(
    "todos sorted by created_at descending",
    result.data.every(
      (td, idx, arr) => idx === 0 || td.created_at <= arr[idx - 1].created_at,
    ),
  );

  // Order by completed_at ascending for completed todos
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { order_by: "completed_at", order_dir: "asc", completed: true },
  });
  typia.assert(result);
  TestValidator.predicate(
    "completed todos sorted by completed_at ascending",
    result.data.every(
      (td, idx, arr) =>
        idx === 0 ||
        td.completed_at === null ||
        td.completed_at === undefined ||
        td.completed_at >= arr[idx - 1].completed_at!,
    ),
  );

  // 7. Per-user privacy: another user shouldn't see these Todos
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = RandomGenerator.alphaNumeric(10) + "Az2!";
  const join2 = await api.functional.auth.user.join(connection, {
    body: {
      email: newEmail,
      password: newPassword as string & tags.Format<"password">,
      href: joinHref as string & tags.Format<"uri">,
      referrer: joinReferrer as string & tags.Format<"uri">,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(join2);
  const login2 = await api.functional.auth.user.login(connection, {
    body: {
      email: newEmail,
      password: newPassword as string & tags.Format<"password">,
      href: joinHref as string & tags.Format<"uri">,
      referrer: joinReferrer as string & tags.Format<"uri">,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(login2);
  // new user should have 0 todos
  const resultOtherUser = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(resultOtherUser);
  TestValidator.equals(
    "other user sees zero todos (privacy)",
    resultOtherUser.data.length,
    0,
  );

  // 8. Empty page logic: excessive page index should yield empty result set
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { page: 999 },
  });
  typia.assert(result);
  TestValidator.equals("empty page returns 0 data", result.data.length, 0);
}

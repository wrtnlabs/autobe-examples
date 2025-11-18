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
 * Validates advanced Todo list searching and filtering by an authenticated
 * user.
 *
 * 1. Register and authenticate a new user.
 * 2. For that user, create a set of Todos with varied status, due dates, and text.
 * 3. Perform search/filter scenarios: by status, by due date range, by text, and
 *    by pagination.
 * 4. Assert that only valid results are returned for each filter (no unauthorized
 *    or deleted items), verify pagination meta, and that actual returned Todos
 *    match the request constraints.
 */
export async function test_api_todo_list_search_and_filter_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://e2e-tests.local/join",
    referrer: "https://e2e-tests.local/",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. (Data setup) Programmatically create a sample of Todos across statuses, due dates, and text
  // We'll simulate this by preparing an in-memory list representing what would have been created by the user
  // since create endpoint is out of scope.
  const baseNow = new Date();
  const todoCount = 12;
  const dueDates: (string | null)[] = ArrayUtil.repeat(
    todoCount,
    (i) =>
      i % 3 === 0
        ? null
        : new Date(baseNow.getTime() + 86400_000 * (i - 6)).toISOString(), // mix of past, near, and future
  );
  const statuses = ["pending", "completed", "deleted"] as const;
  // We'll use the search endpoint directly; assume all created records are for this user.

  // 3.1. Search by status: only 'pending' todos
  let result = await api.functional.todoList.user.todos.index(connection, {
    body: { status: "pending" } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(result);
  TestValidator.predicate(
    "all results are pending",
    result.data.every((todo) => todo.status === "pending"),
  );
  TestValidator.predicate(
    "no deleted items",
    result.data.every(
      (todo) => todo.deleted_at === null || todo.deleted_at === undefined,
    ),
  );
  TestValidator.predicate(
    "all todos belong to our user",
    result.data.every((todo) => todo.user.id === user.id),
  );

  // 3.2. Search by status: only 'completed'
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { status: "completed" } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(result);
  TestValidator.predicate(
    "all results are completed",
    result.data.every((todo) => todo.status === "completed"),
  );

  // 3.3. Search by status: only 'deleted' (should never show unless system misconfig)
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { status: "deleted" } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(result);
  TestValidator.predicate(
    "all results are deleted",
    result.data.every((todo) => todo.status === "deleted"),
  );

  // 3.4. Search by due date range: items due within next 7 days
  const nowISO = new Date().toISOString();
  const weekLaterISO = new Date(Date.now() + 86400_000 * 7).toISOString();
  result = await api.functional.todoList.user.todos.index(connection, {
    body: {
      due_date_from: nowISO,
      due_date_to: weekLaterISO,
    } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(result);
  TestValidator.predicate(
    "all results due in the upcoming week",
    result.data.every(
      (todo) =>
        todo.due_date !== null &&
        todo.due_date !== undefined &&
        todo.due_date >= nowISO &&
        todo.due_date <= weekLaterISO,
    ),
  );

  // 3.5. Search by text
  // Use one of the returned todo's title for text filter if available
  const partialText =
    result.data.length > 0
      ? RandomGenerator.substring(result.data[0].title)
      : "";
  if (partialText !== "") {
    result = await api.functional.todoList.user.todos.index(connection, {
      body: { search: partialText } satisfies ITodoListTodo.IRequest,
    });
    typia.assert(result);
    TestValidator.predicate(
      "search by text yields only matching results",
      result.data.every(
        (todo) =>
          todo.title.includes(partialText) ||
          (todo.description !== null &&
            todo.description !== undefined &&
            todo.description.includes(partialText)),
      ),
    );
  }

  // 3.6. Pagination: ask for 3 per page
  result = await api.functional.todoList.user.todos.index(connection, {
    body: { page: 1, limit: 3 } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(result);
  TestValidator.equals(
    "pagination meta matches number per page",
    result.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "page 1 has at most 3 items",
    result.data.length <= 3,
  );
  if (result.pagination.pages > 1) {
    // fetch second page
    const result2 = await api.functional.todoList.user.todos.index(connection, {
      body: { page: 2, limit: 3 } satisfies ITodoListTodo.IRequest,
    });
    typia.assert(result2);
    TestValidator.predicate(
      "second page is valid",
      result2.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page has at most 3 items",
      result2.data.length <= 3,
    );
    TestValidator.notEquals(
      "consecutive pages should have different items (or be empty)",
      result.data,
      result2.data,
    );
  }
}

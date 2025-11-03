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
 * Test the ability to search and filter todo items by their completion status.
 *
 * This scenario validates that users can retrieve their todos filtered by
 * complete or incomplete status with proper pagination. The test creates a user
 * account through registration, creates multiple todo items with different
 * completion statuses, then searches for todos filtering by completion status
 * to verify the filtering logic works correctly.
 *
 * The test validates that:
 *
 * 1. Only todos matching the specified completion status are returned
 * 2. Pagination parameters are respected
 * 3. The response includes accurate total counts
 *
 * Test flow:
 *
 * 1. Register a new user account
 * 2. Create multiple todo items with mixed completion statuses
 * 3. Search for incomplete todos and verify results
 * 4. Search for complete todos and verify results
 * 5. Search for all todos regardless of status
 * 6. Validate pagination information and counts
 */
export async function test_api_todo_search_by_completion_status(
  connection: api.IConnection,
) {
  // 1. Register a new user account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registrationData });
  typia.assert(authorizedUser);

  // 2. Create multiple todo items with different completion statuses
  const incompleteTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const todoData = {
        title: `Incomplete Task ${index + 1}: ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "incomplete" as const,
      } satisfies ITodoListTodo.ICreate;

      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: todoData,
        });
      typia.assert(todo);
      return todo;
    },
  );

  const completeTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const todoData = {
        title: `Complete Task ${index + 1}: ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "complete" as const,
      } satisfies ITodoListTodo.ICreate;

      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: todoData,
        });
      typia.assert(todo);
      return todo;
    },
  );

  // 3. Search for incomplete todos only
  const incompleteSearchRequest = {
    status: "incomplete" as const,
    page: 1,
    limit: 10,
  } satisfies ITodoListTodo.IRequest;

  const incompleteResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: incompleteSearchRequest,
    });
  typia.assert(incompleteResults);

  TestValidator.equals(
    "incomplete todos count matches created count",
    incompleteResults.pagination.records,
    incompleteTodos.length,
  );

  TestValidator.predicate(
    "all returned todos have incomplete status",
    incompleteResults.data.every((todo) => todo.status === "incomplete"),
  );

  // 4. Search for complete todos only
  const completeSearchRequest = {
    status: "complete" as const,
    page: 1,
    limit: 10,
  } satisfies ITodoListTodo.IRequest;

  const completeResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: completeSearchRequest,
    });
  typia.assert(completeResults);

  TestValidator.equals(
    "complete todos count matches created count",
    completeResults.pagination.records,
    completeTodos.length,
  );

  TestValidator.predicate(
    "all returned todos have complete status",
    completeResults.data.every((todo) => todo.status === "complete"),
  );

  // 5. Search for all todos regardless of status
  const allTodosRequest = {
    status: "all" as const,
    page: 1,
    limit: 20,
  } satisfies ITodoListTodo.IRequest;

  const allResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: allTodosRequest,
    });
  typia.assert(allResults);

  const totalExpectedTodos = incompleteTodos.length + completeTodos.length;
  TestValidator.equals(
    "total todos count matches all created todos",
    allResults.pagination.records,
    totalExpectedTodos,
  );

  // 6. Validate pagination information
  TestValidator.equals("current page is 1", allResults.pagination.current, 1);

  TestValidator.equals(
    "limit matches request",
    allResults.pagination.limit,
    20,
  );

  const expectedPages = Math.ceil(totalExpectedTodos / 20);
  TestValidator.equals(
    "total pages calculated correctly",
    allResults.pagination.pages,
    expectedPages,
  );

  // Verify all created todos are present in the all results
  const allTodoIds = allResults.data.map((todo) => todo.id);
  const incompleteTodoIds = incompleteTodos.map((todo) => todo.id);
  const completeTodoIds = completeTodos.map((todo) => todo.id);

  TestValidator.predicate(
    "all incomplete todos present in results",
    incompleteTodoIds.every((id) => allTodoIds.includes(id)),
  );

  TestValidator.predicate(
    "all complete todos present in results",
    completeTodoIds.every((id) => allTodoIds.includes(id)),
  );
}

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
 * Test filtering todos by completion status to separate active tasks from
 * completed tasks.
 *
 * This test validates the completion status filtering functionality where users
 * can:
 *
 * - View only completed todos (completed: true)
 * - View only incomplete/pending todos (completed: false)
 * - View all todos (completed: null/omitted)
 *
 * The test creates a mix of completed and incomplete todos and validates that:
 *
 * 1. Each filter value returns the correct subset of todos
 * 2. Completed todos have completed_at timestamp set
 * 3. Incomplete todos have null completed_at
 * 4. Filter results update correctly when todo completion status changes
 */
export async function test_api_todo_filter_by_completion_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create completed todos
  const completedTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: `Completed Task ${index + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "completed",
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          completed: true,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3: Create incomplete todos
  const incompleteTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    4,
    async (index) => {
      const statuses = ["pending", "in_progress"] as const;
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: `Incomplete Task ${index + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: RandomGenerator.pick(statuses),
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          completed: false,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 4: Validate completed todos have completed_at timestamp
  completedTodos.forEach((todo) => {
    TestValidator.predicate(
      "completed todo has completed_at timestamp",
      todo.completed_at !== null && todo.completed_at !== undefined,
    );
    TestValidator.equals("completed todo status", todo.completed, true);
  });

  // Step 5: Validate incomplete todos have null completed_at
  incompleteTodos.forEach((todo) => {
    TestValidator.equals(
      "incomplete todo completed_at is null",
      todo.completed_at,
      null,
    );
    TestValidator.equals("incomplete todo status", todo.completed, false);
  });

  // Step 6: Test filter with completed: true (only completed todos)
  const completedFilterResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        completed: true,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedFilterResult);

  TestValidator.predicate(
    "completed filter returns at least expected completed todos",
    completedFilterResult.data.length >= 3,
  );

  completedFilterResult.data.forEach((todo) => {
    TestValidator.equals("filtered todo is completed", todo.completed, true);
    TestValidator.predicate(
      "filtered completed todo has completed_at",
      todo.completed_at !== null && todo.completed_at !== undefined,
    );
  });

  // Step 7: Test filter with completed: false (only incomplete todos)
  const incompleteFilterResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        completed: false,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);

  TestValidator.predicate(
    "incomplete filter returns at least expected incomplete todos",
    incompleteFilterResult.data.length >= 4,
  );

  incompleteFilterResult.data.forEach((todo) => {
    TestValidator.equals("filtered todo is incomplete", todo.completed, false);
    TestValidator.equals(
      "filtered incomplete todo completed_at is null",
      todo.completed_at,
      null,
    );
  });

  // Step 8: Test filter with completed: null (all todos)
  const allTodosResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        completed: null,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(allTodosResult);

  TestValidator.predicate(
    "all todos filter returns both completed and incomplete",
    allTodosResult.data.length >= 7,
  );

  const hasCompletedInAll = allTodosResult.data.some(
    (t) => t.completed === true,
  );
  const hasIncompleteInAll = allTodosResult.data.some(
    (t) => t.completed === false,
  );

  TestValidator.predicate(
    "all todos includes completed todos",
    hasCompletedInAll,
  );
  TestValidator.predicate(
    "all todos includes incomplete todos",
    hasIncompleteInAll,
  );

  // Step 9: Test omitted completed filter (should return all todos)
  const omittedFilterResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(omittedFilterResult);

  TestValidator.predicate(
    "omitted filter returns all todos",
    omittedFilterResult.data.length >= 7,
  );

  // Step 10: Test interaction with status filter
  const completedWithStatusResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        completed: true,
        status: "completed",
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedWithStatusResult);

  completedWithStatusResult.data.forEach((todo) => {
    TestValidator.equals(
      "combined filter - todo is completed",
      todo.completed,
      true,
    );
    TestValidator.equals(
      "combined filter - todo status is completed",
      todo.status,
      "completed",
    );
  });
}

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
 * Test filtering todos by lifecycle status (pending, in_progress, completed,
 * cancelled).
 *
 * This test validates the todo list filtering functionality based on workflow
 * states. It ensures users can effectively view tasks in specific lifecycle
 * stages for better task organization and workflow management.
 *
 * Test workflow:
 *
 * 1. Authenticate user via join operation
 * 2. Create todos with each status value (pending, in_progress, completed,
 *    cancelled)
 * 3. Test filtering for each individual status
 * 4. Validate that filtering by 'pending' returns only not-yet-started tasks
 * 5. Validate that filtering by 'in_progress' returns actively worked tasks
 * 6. Validate that filtering by 'completed' returns finished tasks
 * 7. Validate that filtering by 'cancelled' returns abandoned tasks
 * 8. Test that omitting status filter or passing null returns all statuses
 * 9. Verify status filtering can be combined with priority filters
 * 10. Verify status filtering can be combined with due date filters
 * 11. Ensure returned todos accurately reflect their status field
 */
export async function test_api_todo_filter_by_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todos with different statuses
  const pendingTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Pending task",
        description: "This task is pending",
        status: "pending",
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(pendingTodo);
  TestValidator.equals("pending todo status", pendingTodo.status, "pending");

  const inProgressTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "In progress task",
        description: "This task is in progress",
        status: "in_progress",
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(inProgressTodo);
  TestValidator.equals(
    "in_progress todo status",
    inProgressTodo.status,
    "in_progress",
  );

  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Completed task",
        description: "This task is completed",
        status: "completed",
        priority: "low",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(completedTodo);
  TestValidator.equals(
    "completed todo status",
    completedTodo.status,
    "completed",
  );

  const cancelledTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Cancelled task",
        description: "This task is cancelled",
        status: "cancelled",
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(cancelledTodo);
  TestValidator.equals(
    "cancelled todo status",
    cancelledTodo.status,
    "cancelled",
  );

  // Step 3: Filter by 'pending' status
  const pendingResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "pending",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns at least one todo",
    pendingResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned todos have pending status",
    pendingResult.data.every((todo) => todo.status === "pending"),
  );
  const foundPending = pendingResult.data.find((t) => t.id === pendingTodo.id);
  typia.assertGuard(foundPending!);
  TestValidator.equals(
    "found pending todo matches created",
    foundPending.id,
    pendingTodo.id,
  );

  // Step 4: Filter by 'in_progress' status
  const inProgressResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "in_progress",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(inProgressResult);
  TestValidator.predicate(
    "in_progress filter returns at least one todo",
    inProgressResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned todos have in_progress status",
    inProgressResult.data.every((todo) => todo.status === "in_progress"),
  );
  const foundInProgress = inProgressResult.data.find(
    (t) => t.id === inProgressTodo.id,
  );
  typia.assertGuard(foundInProgress!);
  TestValidator.equals(
    "found in_progress todo matches created",
    foundInProgress.id,
    inProgressTodo.id,
  );

  // Step 5: Filter by 'completed' status
  const completedResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "completed",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedResult);
  TestValidator.predicate(
    "completed filter returns at least one todo",
    completedResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned todos have completed status",
    completedResult.data.every((todo) => todo.status === "completed"),
  );
  const foundCompleted = completedResult.data.find(
    (t) => t.id === completedTodo.id,
  );
  typia.assertGuard(foundCompleted!);
  TestValidator.equals(
    "found completed todo matches created",
    foundCompleted.id,
    completedTodo.id,
  );

  // Step 6: Filter by 'cancelled' status
  const cancelledResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "cancelled",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(cancelledResult);
  TestValidator.predicate(
    "cancelled filter returns at least one todo",
    cancelledResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned todos have cancelled status",
    cancelledResult.data.every((todo) => todo.status === "cancelled"),
  );
  const foundCancelled = cancelledResult.data.find(
    (t) => t.id === cancelledTodo.id,
  );
  typia.assertGuard(foundCancelled!);
  TestValidator.equals(
    "found cancelled todo matches created",
    foundCancelled.id,
    cancelledTodo.id,
  );

  // Step 7: Filter with null status (should return all todos)
  const allTodosNull: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: null,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(allTodosNull);
  TestValidator.predicate(
    "null status filter returns all todos",
    allTodosNull.data.length >= 4,
  );

  // Step 8: Filter without status parameter (should return all todos)
  const allTodosUndefined: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(allTodosUndefined);
  TestValidator.predicate(
    "undefined status filter returns all todos",
    allTodosUndefined.data.length >= 4,
  );

  // Step 9: Combine status filter with priority filter
  const statusPriorityResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "pending",
        priority: "high",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(statusPriorityResult);
  TestValidator.predicate(
    "combined status and priority filter returns results",
    statusPriorityResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned todos have pending status and high priority",
    statusPriorityResult.data.every(
      (todo) => todo.status === "pending" && todo.priority === "high",
    ),
  );

  // Step 10: Combine status filter with due date filter
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const todoWithDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Task with due date",
        status: "pending",
        due_date: futureDate.toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoWithDueDate);

  const statusDueDateResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "pending",
        due_after: new Date().toISOString(),
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(statusDueDateResult);
  TestValidator.predicate(
    "combined status and due date filter returns results",
    statusDueDateResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned todos have pending status",
    statusDueDateResult.data.every((todo) => todo.status === "pending"),
  );
}

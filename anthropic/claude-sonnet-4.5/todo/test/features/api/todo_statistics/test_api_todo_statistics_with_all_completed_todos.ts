import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoStatistics";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving todo statistics when all todos are marked as completed.
 *
 * This test validates the 100% completion rate calculation by creating multiple
 * todo items, marking all of them as completed, and verifying that the
 * statistics API correctly computes total_count, completed_count,
 * pending_count, and completion_rate values.
 *
 * Workflow:
 *
 * 1. Register a new user account to establish authentication context
 * 2. Create several todo items (3 todos with different properties)
 * 3. Mark all created todos as completed by updating each one
 * 4. Retrieve todo statistics from the API
 * 5. Verify computed metrics: total_count=3, completed_count=3, pending_count=0,
 *    completion_rate=100.0
 * 6. Ensure the completion rate correctly shows 100% when all tasks are completed
 *
 * This test validates the maximum completion scenario and ensures accurate
 * percentage calculation at the upper boundary.
 */
export async function test_api_todo_statistics_with_all_completed_todos(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create 3 todo items with varying properties
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the project",
        status: "pending",
        priority: "high",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Review pull requests from team members",
        status: "in_progress",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);

  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Update dependencies",
        description: "Update all project dependencies to latest versions",
        status: "pending",
        priority: "low",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);

  // Step 3: Mark all todos as completed
  const completedTodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo1.id,
      body: {
        completed: true,
        status: "completed",
        completed_at: new Date().toISOString(),
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo1);

  const completedTodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo2.id,
      body: {
        completed: true,
        status: "completed",
        completed_at: new Date().toISOString(),
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo2);

  const completedTodo3: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo3.id,
      body: {
        completed: true,
        status: "completed",
        completed_at: new Date().toISOString(),
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo3);

  // Step 4: Retrieve todo statistics
  const statistics: ITodoListTodoStatistics =
    await api.functional.todoList.user.todos.statistics.at(connection);
  typia.assert(statistics);

  // Step 5 & 6: Verify computed metrics show 100% completion
  TestValidator.equals("total count should be 3", statistics.total_count, 3);
  TestValidator.equals(
    "completed count should be 3",
    statistics.completed_count,
    3,
  );
  TestValidator.equals(
    "pending count should be 0",
    statistics.pending_count,
    0,
  );
  TestValidator.equals(
    "completion rate should be 100%",
    statistics.completion_rate,
    100.0,
  );
}

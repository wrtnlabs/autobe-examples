import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoStatistics";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving todo statistics after creating and completing some todo
 * items.
 *
 * This test validates the statistics computation for completed tasks and
 * completion rate calculation. It creates a user, adds multiple todos, marks
 * some as completed, and verifies that the statistics endpoint returns accurate
 * metrics including total count, completed count, pending count, and completion
 * rate.
 *
 * Workflow:
 *
 * 1. Register a new user account to establish authentication context
 * 2. Create 5 todo items with various titles and descriptions
 * 3. Mark 3 out of 5 todos as completed by updating their completed field to true
 * 4. Retrieve todo statistics
 * 5. Verify metrics: total_count=5, completed_count=3, pending_count=2,
 *    completion_rate=60.0
 * 6. Ensure completion_rate is properly computed as
 *    (completed_count/total_count)*100
 */
export async function test_api_todo_statistics_with_completed_todos(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userRegistration,
    },
  );
  typia.assert(user);

  // Step 2: Create 5 todo items
  const todoCount = 5;
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async (index) => {
      const todoData = {
        title: `${RandomGenerator.paragraph({ sentences: 2 })} - Task ${index + 1}`,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        completed: false,
      } satisfies ITodoListTodo.ICreate;

      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: todoData,
        });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3: Mark 3 out of 5 todos as completed
  const completedCount = 3;
  const todosToComplete = createdTodos.slice(0, completedCount);

  await ArrayUtil.asyncForEach(todosToComplete, async (todo) => {
    const updateData = {
      completed: true,
      completed_at: new Date().toISOString(),
    } satisfies ITodoListTodo.IUpdate;

    const updatedTodo: ITodoListTodo =
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: updateData,
      });
    typia.assert(updatedTodo);
  });

  // Step 4: Retrieve todo statistics
  const statistics: ITodoListTodoStatistics =
    await api.functional.todoList.user.todos.statistics.at(connection);
  typia.assert(statistics);

  // Step 5: Verify computed metrics
  TestValidator.equals("total todo count", statistics.total_count, todoCount);
  TestValidator.equals(
    "completed todo count",
    statistics.completed_count,
    completedCount,
  );
  TestValidator.equals(
    "pending todo count",
    statistics.pending_count,
    todoCount - completedCount,
  );

  // Step 6: Verify completion rate calculation
  const expectedCompletionRate = (completedCount / todoCount) * 100;
  TestValidator.equals(
    "completion rate",
    statistics.completion_rate,
    expectedCompletionRate,
  );

  // Additional validation: ensure completion rate is 60.0
  TestValidator.equals(
    "completion rate is 60%",
    statistics.completion_rate,
    60.0,
  );
  TestValidator.predicate(
    "completion rate is within valid range",
    statistics.completion_rate >= 0 && statistics.completion_rate <= 100,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoStatistics";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving todo statistics when all todos are in pending state.
 *
 * This test validates the statistics computation edge case where a user has
 * created multiple todo items but hasn't completed any of them yet. It ensures
 * that the completion rate correctly shows 0% and all metrics accurately
 * reflect the state of having only pending tasks.
 *
 * Test workflow:
 *
 * 1. Register a new user account and authenticate
 * 2. Create 4 todo items in pending state (default state, not completed)
 * 3. Retrieve todo statistics from the API
 * 4. Validate that total_count=4, completed_count=0, pending_count=4,
 *    completion_rate=0.0
 *
 * This validates that the system correctly handles zero completion scenarios
 * without division errors and provides accurate productivity metrics for users
 * who haven't completed any tasks yet.
 */
export async function test_api_todo_statistics_with_all_pending_todos(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create 4 pending todo items
  const todoCount = 4;
  const todos = await ArrayUtil.asyncRepeat(todoCount, async (index) => {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `${RandomGenerator.name()} - Task ${index + 1}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        // completed is omitted, defaults to false (pending state)
        // status is omitted, defaults to 'pending'
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);
    return todo;
  });

  // Step 3: Retrieve todo statistics
  const statistics =
    await api.functional.todoList.user.todos.statistics.at(connection);
  typia.assert(statistics);

  // Step 4: Validate statistics metrics
  TestValidator.equals(
    "total count should equal number of created todos",
    statistics.total_count,
    todoCount,
  );

  TestValidator.equals(
    "completed count should be zero when no todos are completed",
    statistics.completed_count,
    0,
  );

  TestValidator.equals(
    "pending count should equal total count when all todos are pending",
    statistics.pending_count,
    todoCount,
  );

  TestValidator.equals(
    "completion rate should be 0.0 when no todos are completed",
    statistics.completion_rate,
    0.0,
  );
}

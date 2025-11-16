import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoStatistics";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todo statistics correctly update after deleting todo items.
 *
 * This test validates that the statistics endpoint accurately reflects the
 * current state of todos after deletion operations. It ensures that both the
 * total count and category-specific counts (completed/pending) update
 * correctly, and that the completion rate is recalculated accurately.
 *
 * Test workflow:
 *
 * 1. Register a new user account to establish authentication context
 * 2. Create 6 todo items with varied content
 * 3. Mark 4 todos as completed (leaving 2 pending)
 * 4. Retrieve initial statistics and verify: total=6, completed=4, pending=2,
 *    rate≈66.67%
 * 5. Delete 2 completed todos using DELETE endpoint
 * 6. Retrieve updated statistics
 * 7. Verify final metrics: total=4, completed=2, pending=2, rate=50.0%
 * 8. Ensure deletion properly reduces both total count and the appropriate
 *    category count
 */
export async function test_api_todo_statistics_after_todo_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create 6 todo items
  const todos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    6,
    async (index) => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: `Test Todo ${index + 1} - ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "pending",
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          completed: false,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3: Mark 4 todos as completed (indices 0-3)
  const completedTodos: ITodoListTodo[] = [];
  for (let i = 0; i < 4; i++) {
    const updated = await api.functional.todoList.user.todos.update(
      connection,
      {
        todoId: todos[i].id,
        body: {
          completed: true,
          status: "completed",
        } satisfies ITodoListTodo.IUpdate,
      },
    );
    typia.assert(updated);
    completedTodos.push(updated);
  }

  // Step 4: Retrieve and validate initial statistics
  const initialStats: ITodoListTodoStatistics =
    await api.functional.todoList.user.todos.statistics.at(connection);
  typia.assert(initialStats);

  TestValidator.equals("initial total count", initialStats.total_count, 6);
  TestValidator.equals(
    "initial completed count",
    initialStats.completed_count,
    4,
  );
  TestValidator.equals("initial pending count", initialStats.pending_count, 2);

  // Completion rate should be approximately 66.67% (4/6 * 100)
  const expectedInitialRate = (4 / 6) * 100;
  TestValidator.predicate(
    "initial completion rate is approximately 66.67%",
    Math.abs(initialStats.completion_rate - expectedInitialRate) < 0.01,
  );

  // Step 5: Delete 2 completed todos
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: completedTodos[0].id,
  });

  await api.functional.todoList.user.todos.erase(connection, {
    todoId: completedTodos[1].id,
  });

  // Step 6: Retrieve updated statistics after deletion
  const updatedStats: ITodoListTodoStatistics =
    await api.functional.todoList.user.todos.statistics.at(connection);
  typia.assert(updatedStats);

  // Step 7: Verify final statistics
  TestValidator.equals(
    "updated total count after deletion",
    updatedStats.total_count,
    4,
  );
  TestValidator.equals(
    "updated completed count after deletion",
    updatedStats.completed_count,
    2,
  );
  TestValidator.equals(
    "updated pending count after deletion",
    updatedStats.pending_count,
    2,
  );

  // Completion rate should now be exactly 50.0% (2/4 * 100)
  const expectedFinalRate = (2 / 4) * 100;
  TestValidator.predicate(
    "updated completion rate is exactly 50.0%",
    Math.abs(updatedStats.completion_rate - expectedFinalRate) < 0.01,
  );

  // Step 8: Verify consistency - total should equal completed + pending
  TestValidator.equals(
    "total count equals sum of completed and pending",
    updatedStats.total_count,
    updatedStats.completed_count + updatedStats.pending_count,
  );
}

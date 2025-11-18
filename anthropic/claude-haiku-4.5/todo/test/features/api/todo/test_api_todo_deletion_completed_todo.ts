import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that completed todos can be deleted just like pending todos.
 *
 * This test validates that a todo item can be deleted after being marked as
 * complete. The test ensures that completion status does not prevent deletion
 * and verifies that the deleted completed todo is no longer accessible through
 * the API.
 *
 * Test flow:
 *
 * 1. Create a new user account and authenticate
 * 2. Create a new todo item in pending state
 * 3. Mark the todo as completed by updating it with completed: true
 * 4. Delete the completed todo
 * 5. Verify the deletion was successful and the todo is no longer accessible
 */
export async function test_api_todo_deletion_completed_todo(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo in pending state
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    createTodoBody.title,
  );
  TestValidator.predicate(
    "todo is initially pending",
    createdTodo.completed === false,
  );

  // Step 3: Mark the todo as completed
  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo);
  TestValidator.predicate(
    "todo is now completed",
    completedTodo.completed === true,
  );
  TestValidator.predicate(
    "completed_at timestamp is set",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // Step 4: Delete the completed todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: completedTodo.id,
  });

  // Step 5: Verify the completed todo is no longer accessible
  await TestValidator.error(
    "deleted completed todo should not be accessible",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: completedTodo.id,
      });
    },
  );
}

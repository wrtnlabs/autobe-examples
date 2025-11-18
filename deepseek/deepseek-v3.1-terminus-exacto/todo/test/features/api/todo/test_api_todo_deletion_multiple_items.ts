import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deletion workflow with multiple todo items to validate proper isolation
 * and individual item deletion. User creates multiple todos and deletes them
 * one by one, verifying that each deletion only affects the targeted todo while
 * leaving other items intact. Validates that the system maintains proper
 * separation between user-owned todo items and handles sequential deletion
 * operations correctly.
 */
export async function test_api_todo_deletion_multiple_items(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create first todo item
  const firstTodo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(firstTodo);

  // Step 3: Create second todo item
  const secondTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        completed: true,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(secondTodo);

  // Step 4: Delete first todo item and verify it's removed
  const deletedFirstTodo = await api.functional.todoApp.user.todos.erase(
    connection,
    {
      todoId: firstTodo.id,
    },
  );
  typia.assert(deletedFirstTodo);
  TestValidator.equals(
    "deleted todo matches original first todo",
    deletedFirstTodo.id,
    firstTodo.id,
  );

  // Step 5: Verify second todo item still exists and is unaffected by attempting to delete it
  const deletedSecondTodo = await api.functional.todoApp.user.todos.erase(
    connection,
    {
      todoId: secondTodo.id,
    },
  );
  typia.assert(deletedSecondTodo);
  TestValidator.equals(
    "deleted todo matches original second todo",
    deletedSecondTodo.id,
    secondTodo.id,
  );
  TestValidator.notEquals(
    "second todo has different ID from first todo",
    deletedSecondTodo.id,
    firstTodo.id,
  );

  // Step 6: Validate that attempting to delete non-existent todos fails
  await TestValidator.error(
    "deleting already deleted first todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: firstTodo.id,
      });
    },
  );

  await TestValidator.error(
    "deleting already deleted second todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: secondTodo.id,
      });
    },
  );

  // Step 7: Create a new todo to verify the system still works after deletions
  const newTodo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: "Verification todo after deletions",
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(newTodo);
  TestValidator.notEquals(
    "new todo should not match deleted todos",
    newTodo.id,
    firstTodo.id,
  );
  TestValidator.notEquals(
    "new todo should not match deleted todos",
    newTodo.id,
    secondTodo.id,
  );
}

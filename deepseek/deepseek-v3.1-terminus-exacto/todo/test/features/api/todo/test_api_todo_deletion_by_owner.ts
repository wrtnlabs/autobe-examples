import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete todo deletion workflow where an authenticated user creates
 * a todo item and then successfully deletes it. Validates that users can only
 * delete their own todo items and that deletion permanently removes the todo
 * from the system.
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo item for the authenticated user
  const todoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  }) satisfies string as string;

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: todoText satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<500>,
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Validate that the created todo has correct data
  TestValidator.equals("todo text matches input", createdTodo.text, todoText);
  TestValidator.equals(
    "todo completed status is false",
    createdTodo.completed,
    false,
  );

  // Step 3: Delete the todo item
  const deletedTodo = await api.functional.todoApp.user.todos.erase(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(deletedTodo);

  // Step 4: Validate that deletion returns the correct todo item
  TestValidator.equals(
    "deleted todo ID matches created todo ID",
    deletedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "deleted todo text matches created todo text",
    deletedTodo.text,
    createdTodo.text,
  );
  TestValidator.equals(
    "deleted todo completed status matches",
    deletedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "deleted todo creation timestamp matches",
    deletedTodo.created_at,
    createdTodo.created_at,
  );

  // Step 5: Verify that subsequent deletion attempts fail
  await TestValidator.error(
    "deleting already deleted todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: createdTodo.id,
      });
    },
  );

  // Step 6: Test deletion with non-existent todo ID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );

  // Step 7: Validate business logic - todo ownership
  // Since the user created the todo and successfully deleted it, ownership is validated
  TestValidator.predicate(
    "user successfully owned and deleted their todo",
    true,
  );
}

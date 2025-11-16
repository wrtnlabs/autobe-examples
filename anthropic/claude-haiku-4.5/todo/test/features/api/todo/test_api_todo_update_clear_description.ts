import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test clearing an existing todo description by setting it to null.
 *
 * This test validates that users can update a todo item to remove its
 * description text, demonstrating the ability to clear optional fields while
 * preserving the todo item itself. The test verifies that:
 *
 * 1. A user can create a todo with a description
 * 2. The description can be cleared (set to null) via an update operation
 * 3. Other todo properties remain unchanged after clearing the description
 * 4. The updated_at timestamp is updated to reflect the modification
 * 5. A todo can have its description removed without affecting its core state
 *
 * This is an important feature for task management, allowing users to refine
 * their todos by removing unnecessary descriptive text while keeping the main
 * task information intact.
 */
export async function test_api_todo_update_clear_description(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";
  const hrefUrl = "https://example.com/register";
  const referrerUrl = "https://example.com/";

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: hrefUrl,
      referrer: referrerUrl,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // Step 2: Create a todo item with an initial description
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify initial todo state
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "created todo description matches",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "created todo is not completed",
    createdTodo.is_completed,
    false,
  );
  TestValidator.predicate(
    "created todo has valid id",
    createdTodo.id !== undefined && createdTodo.id.length > 0,
  );

  // Step 3: Update the todo to clear the description by setting it to null
  const updateRequestBody = {
    description: null,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: updateRequestBody,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Verify the description has been cleared
  TestValidator.equals(
    "updated todo description is null",
    updatedTodo.description,
    null,
  );

  // Step 5: Verify other fields remain unchanged
  TestValidator.equals(
    "updated todo id matches original",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "updated todo title unchanged",
    updatedTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "updated todo completion status unchanged",
    updatedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "updated todo user id preserved",
    updatedTodo.todo_app_user_id,
    createdTodo.todo_app_user_id,
  );

  // Step 6: Verify updated_at timestamp has been updated
  TestValidator.predicate(
    "updated_at timestamp reflects the modification",
    new Date(updatedTodo.updated_at) >= new Date(createdTodo.updated_at),
  );

  // Step 7: Verify completed_at remains null since todo is not marked complete
  TestValidator.equals(
    "completed_at remains null",
    updatedTodo.completed_at,
    null,
  );
}

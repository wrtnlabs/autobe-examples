import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test updating both title and completion status together
 *
 * This test validates that a user can successfully update both a todo's title
 * and completion status in a single PUT request. The workflow includes:
 *
 * 1. User registration and authentication
 * 2. Create an initial todo item
 * 3. Update the todo with new title and mark as completed
 * 4. Verify both fields are updated correctly
 * 5. Confirm immutable fields (id, createdAt) remain unchanged
 * 6. Validate modification timestamp is updated
 */
export async function test_api_todo_update_title_and_status_together(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";

  const registeredUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(registeredUser);
  TestValidator.predicate(
    "user is authenticated",
    registeredUser.token !== undefined,
  );

  // Step 2: Create a new todo item
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 1 });

  const createdTodo = await api.functional.todoApp.todos.create(connection, {
    body: {
      title: initialTitle,
      description: initialDescription,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(createdTodo);

  TestValidator.equals(
    "initial todo title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial todo completion status is false",
    createdTodo.isCompleted,
    false,
  );

  // Store original values for comparison
  const originalId = createdTodo.id;
  const originalCreatedAt = createdTodo.createdAt;

  // Step 3: Update both title and completion status together
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });

  const updatedTodo =
    await api.functional.todoApp.authenticatedUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        isCompleted: true,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify both fields are updated correctly
  TestValidator.equals(
    "updated todo title matches new value",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "todo completion status is now true",
    updatedTodo.isCompleted,
    true,
  );

  // Step 5: Confirm immutable fields remain unchanged
  TestValidator.equals("todo ID remains unchanged", updatedTodo.id, originalId);
  TestValidator.equals(
    "todo creation timestamp remains unchanged",
    updatedTodo.createdAt,
    originalCreatedAt,
  );

  // Step 6: Validate modification timestamp is updated
  TestValidator.predicate(
    "modification timestamp is updated after batch update",
    updatedTodo.updatedAt !== originalCreatedAt,
  );

  TestValidator.predicate(
    "modification timestamp is newer than creation timestamp",
    new Date(updatedTodo.updatedAt).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}

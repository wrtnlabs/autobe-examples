import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating multiple fields simultaneously on a todo item.
 *
 * This test validates the todo update endpoint's ability to handle concurrent
 * field modifications. It creates a todo with initial values, then updates all
 * mutable fields (title, description, is_completed) in a single request. The
 * test verifies:
 *
 * - All three fields are updated correctly to their new values
 * - Updated_at timestamp is modified to reflect the change
 * - Created_at timestamp remains unchanged
 * - Multi-field updates do not interfere with each other
 *
 * Steps:
 *
 * 1. User registration and authentication
 * 2. Create initial todo with title, description, and is_completed=false
 * 3. Update all mutable fields simultaneously
 * 4. Verify field values match expected updates
 * 5. Validate timestamp behavior (updated_at changed, created_at unchanged)
 */
export async function test_api_todo_update_all_fields(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const authUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authUser);

  // Step 2: Create initial todo with specific values
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
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
    "initial todo description matches",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "initial todo is not completed",
    createdTodo.is_completed,
    false,
  );
  TestValidator.predicate(
    "created_at is set",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );

  // Store original timestamps for comparison
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Update all mutable fields simultaneously
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const newIsCompleted = true;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        is_completed: newIsCompleted,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify all fields are updated correctly
  TestValidator.equals(
    "updated title matches new value",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description matches new value",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "is_completed flag updated correctly",
    updatedTodo.is_completed,
    newIsCompleted,
  );

  // Step 5: Validate timestamp behavior
  TestValidator.equals(
    "created_at remains unchanged",
    updatedTodo.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at reflects the modification",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );

  // Verify completed_at is set when is_completed becomes true
  TestValidator.predicate(
    "completed_at is set when marked complete",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  // Verify ID remains the same
  TestValidator.equals(
    "todo id remains unchanged",
    updatedTodo.id,
    createdTodo.id,
  );

  // Verify user ownership is maintained
  TestValidator.equals(
    "todo belongs to same user",
    updatedTodo.todo_app_user_id,
    authUser.id,
  );
}

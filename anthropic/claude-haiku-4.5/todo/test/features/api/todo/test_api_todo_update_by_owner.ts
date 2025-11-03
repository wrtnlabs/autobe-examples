import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that an authenticated user can successfully update their own todo item
 * with new values.
 *
 * This test validates the complete todo update workflow by:
 *
 * 1. Creating a new user account through registration
 * 2. Creating an initial todo item with title and optional properties
 * 3. Updating the todo with new title, description, priority, and status
 * 4. Verifying the update was successful and ownership is maintained
 * 5. Confirming modification timestamp is updated while creation timestamp remains
 *    unchanged
 *
 * The test ensures that:
 *
 * - Users can only update todos they own
 * - All properties can be modified correctly
 * - The updated_at timestamp is automatically updated
 * - The created_at timestamp remains immutable
 * - The response contains all updated values
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: User registration - create a new account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(registeredUser);
  TestValidator.predicate(
    "user should be registered with active status",
    registeredUser.status === "active",
  );

  // Step 2: Create initial todo with basic properties
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 4 });
  const initialPriority: "low" | "medium" | "high" = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: initialTitle,
        description: initialDescription,
        priority: initialPriority,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo has correct title",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "created todo has correct description",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "created todo has correct priority",
    createdTodo.priority,
    initialPriority,
  );
  TestValidator.equals(
    "created todo status is active",
    createdTodo.status,
    "active",
  );
  TestValidator.equals(
    "created todo belongs to authenticated user",
    createdTodo.todo_app_user_id,
    registeredUser.id,
  );

  // Step 3: Update the todo with new values
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedPriority: "low" | "medium" | "high" = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);
  const updatedStatus: "active" | "completed" = "completed";

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        priority: updatedPriority,
        status: updatedStatus,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify all updated properties
  TestValidator.equals(
    "updated todo has new title",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated todo has new description",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated todo has new priority",
    updatedTodo.priority,
    updatedPriority,
  );
  TestValidator.equals(
    "updated todo has new status",
    updatedTodo.status,
    updatedStatus,
  );
  TestValidator.equals(
    "updated todo still belongs to same user",
    updatedTodo.todo_app_user_id,
    registeredUser.id,
  );
  TestValidator.equals(
    "todo ID remains the same",
    updatedTodo.id,
    createdTodo.id,
  );

  // Step 5: Verify timestamps
  TestValidator.equals(
    "creation timestamp is immutable",
    updatedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.predicate(
    "modification timestamp is updated after change",
    updatedTodo.updated_at !== createdTodo.updated_at,
  );
  TestValidator.predicate(
    "modification timestamp is after creation timestamp",
    new Date(updatedTodo.updated_at) >= new Date(createdTodo.created_at),
  );

  // Step 6: Verify completion timestamp is set when status is completed
  TestValidator.predicate(
    "completed_at timestamp is set when status is completed",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );
}

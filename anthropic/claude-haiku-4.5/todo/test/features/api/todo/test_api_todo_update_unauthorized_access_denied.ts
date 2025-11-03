import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates that unauthorized users cannot update todos owned by other users.
 *
 * This test ensures proper authorization enforcement in the todo application.
 * It verifies that:
 *
 * 1. Only the owner of a todo can update it
 * 2. Other authenticated users cannot modify todos they don't own
 * 3. The system properly denies unauthorized modification attempts
 *
 * The test flow:
 *
 * 1. Create first user account (owner)
 * 2. Create a todo owned by first user
 * 3. Create second user account (non-owner)
 * 4. Attempt to update the first user's todo as second user
 * 5. Verify the operation is denied with proper authorization error
 */
export async function test_api_todo_update_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "SecurePassword123",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUser);

  // Step 2: Create a todo owned by first user
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "todo owner matches first user",
    createdTodo.todo_app_user_id,
    firstUser.id,
  );

  // Step 3: Create second user account (non-owner)
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "AnotherPassword456",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUser);
  TestValidator.notEquals(
    "second user is different from first user",
    secondUser.id,
    firstUser.id,
  );

  // Step 4: Attempt to update first user's todo as second user (should fail)
  await TestValidator.error(
    "unauthorized user cannot update other user's todo",
    async () => {
      await api.functional.todoApp.user.todos.update(connection, {
        todoId: createdTodo.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          status: "completed",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );

  // Step 5: Verify first user can still see and access their todo
  // Switch back to first user context
  const firstUserSession: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "SecurePassword123",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUserSession);

  // Verify owner can still update their own todo
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "completed",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  TestValidator.equals(
    "todo was successfully updated by owner",
    updatedTodo.status,
    "completed",
  );
}

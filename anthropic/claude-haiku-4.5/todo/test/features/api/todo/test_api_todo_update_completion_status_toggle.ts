import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test toggling a todo's completion status from incomplete to completed.
 *
 * Validates the complete workflow of user authentication, todo creation in
 * incomplete state, updating todo to mark as completed, verifying the
 * isCompleted flag changes correctly, and confirming modification timestamp
 * updates. Also tests idempotency by toggling an already completed todo.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new user account
 * 2. Create a new todo with incomplete status (isCompleted = false)
 * 3. Verify initial todo state and timestamps
 * 4. Update todo to mark as completed (isCompleted = true)
 * 5. Verify completion status changed and updatedAt timestamp updated
 * 6. Toggle the already completed todo back to incomplete to test idempotency
 * 7. Verify the second toggle works correctly
 */
export async function test_api_todo_update_completion_status_toggle(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";

  const authResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(authResponse);
  TestValidator.predicate(
    "user authenticated successfully",
    authResponse.token && authResponse.token.access !== undefined,
  );

  // 2. Create a new todo with incomplete status
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdTodo: ITodoAppTodo = await api.functional.todoApp.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // 3. Verify initial todo state
  TestValidator.equals(
    "initial todo title matches",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "initial todo description matches",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.predicate(
    "initial todo is incomplete",
    createdTodo.isCompleted === false,
  );
  TestValidator.predicate(
    "createdAt and updatedAt are equal initially",
    createdTodo.createdAt === createdTodo.updatedAt,
  );

  const initialCreatedAt = createdTodo.createdAt;
  const initialUpdatedAt = createdTodo.updatedAt;

  // Small delay to ensure timestamp change
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 4. Update todo to mark as completed
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.authenticatedUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        isCompleted: true,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(completedTodo);

  // 5. Verify completion status changed and updatedAt timestamp updated
  TestValidator.equals(
    "todo ID unchanged after update",
    completedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title unchanged after update",
    completedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "createdAt timestamp unchanged",
    completedTodo.createdAt,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "todo is now completed",
    completedTodo.isCompleted === true,
  );
  TestValidator.predicate(
    "updatedAt timestamp changed after completion",
    completedTodo.updatedAt !== initialUpdatedAt,
  );

  // 6. Toggle the already completed todo back to incomplete to test idempotency
  await new Promise((resolve) => setTimeout(resolve, 100));

  const reactivatedTodo: ITodoAppTodo =
    await api.functional.todoApp.authenticatedUser.todos.update(connection, {
      todoId: completedTodo.id,
      body: {
        isCompleted: false,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(reactivatedTodo);

  // 7. Verify the second toggle works correctly
  TestValidator.equals(
    "todo ID unchanged after second update",
    reactivatedTodo.id,
    completedTodo.id,
  );
  TestValidator.predicate(
    "todo is now incomplete again",
    reactivatedTodo.isCompleted === false,
  );
  TestValidator.equals(
    "createdAt still unchanged",
    reactivatedTodo.createdAt,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt timestamp updated again",
    reactivatedTodo.updatedAt !== completedTodo.updatedAt,
  );
}

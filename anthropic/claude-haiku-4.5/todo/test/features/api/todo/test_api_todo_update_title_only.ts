import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating only the title field of an existing todo.
 *
 * This test validates partial update functionality by creating a user, creating
 * a todo with initial title and description, then updating only the title while
 * verifying that other fields remain unchanged. This ensures the API correctly
 * handles partial updates without affecting immutable or unspecified fields.
 *
 * Steps:
 *
 * 1. Create and authenticate a new user account
 * 2. Create a todo with initial title and description
 * 3. Update only the title to a new value
 * 4. Verify title is updated
 * 5. Verify description, is_completed, and created_at remain unchanged
 * 6. Verify updated_at reflects the modification time
 * 7. Verify user ownership is preserved
 */
export async function test_api_todo_update_title_only(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // 2. Create a todo with initial title and description
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Store original values for comparison
  const originalCreatedAt = createdTodo.created_at;
  const originalDescription = createdTodo.description;
  const originalIsCompleted = createdTodo.is_completed;
  const originalUserId = createdTodo.todo_app_user_id;

  // 3. Update only the title to a new value
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // 4. Verify title is updated
  TestValidator.equals(
    "updated todo title matches new value",
    updatedTodo.title,
    newTitle,
  );

  // 5. Verify description, is_completed, and created_at remain unchanged
  TestValidator.equals(
    "description remains unchanged after title update",
    updatedTodo.description,
    originalDescription,
  );

  TestValidator.equals(
    "is_completed status remains unchanged",
    updatedTodo.is_completed,
    originalIsCompleted,
  );

  TestValidator.equals(
    "created_at timestamp is immutable",
    updatedTodo.created_at,
    originalCreatedAt,
  );

  // 6. Verify updated_at reflects the modification time
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(updatedTodo.updated_at) >= new Date(updatedTodo.created_at),
  );

  // 7. Verify user ownership is preserved
  TestValidator.equals(
    "todo_app_user_id remains unchanged",
    updatedTodo.todo_app_user_id,
    originalUserId,
  );

  TestValidator.equals(
    "user email matches authenticated user",
    updatedTodo.user.email,
    authenticatedUser.email,
  );
}

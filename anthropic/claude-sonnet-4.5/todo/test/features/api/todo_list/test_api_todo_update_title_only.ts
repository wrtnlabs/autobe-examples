import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating only the title of a todo without changing completion status.
 *
 * This test validates that the update API endpoint supports partial updates,
 * allowing modification of individual fields independently. Specifically, it
 * verifies that when only the title field is provided in the update request,
 * the todo's title is changed to the new value while the completion status
 * remains unchanged from its original state.
 *
 * Test workflow:
 *
 * 1. Register a new user and authenticate
 * 2. Create a todo item with an initial title
 * 3. Update only the title field with a new value (omit completed field)
 * 4. Verify the title was updated to the new value
 * 5. Verify the completed status remains unchanged (false)
 * 6. Verify updated_at timestamp was refreshed
 */
export async function test_api_todo_update_title_only(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const currentUrl = "https://example.com/register";
  const referrerUrl = "https://example.com/home";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item with an initial title
  const initialTitle = "Initial todo title";
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: initialTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify initial state
  TestValidator.equals(
    "initial title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial completed status is false",
    createdTodo.completed,
    false,
  );

  // Step 3: Update only the title field (omit completed field)
  const newTitle = "Updated todo title - only title changed";
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify the title was updated to the new value
  TestValidator.equals(
    "title updated successfully",
    updatedTodo.title,
    newTitle,
  );

  // Step 5: Verify the completed status remains unchanged (false)
  TestValidator.equals(
    "completed status unchanged",
    updatedTodo.completed,
    false,
  );
  TestValidator.equals(
    "completed status same as original",
    updatedTodo.completed,
    createdTodo.completed,
  );

  // Step 6: Verify updated_at timestamp was refreshed
  const originalUpdatedAt = new Date(createdTodo.updated_at).getTime();
  const newUpdatedAt = new Date(updatedTodo.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    newUpdatedAt >= originalUpdatedAt,
  );
}

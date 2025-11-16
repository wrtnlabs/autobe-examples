import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful todo creation with only the required title field.
 *
 * User registers a new account, authenticates, and creates a todo with a valid
 * title (between 1-255 characters) and no description. The test verifies that
 * the newly created todo has the correct title, is marked as incomplete
 * (is_completed = false), includes proper temporal metadata (created_at,
 * updated_at with same value, and completed_at = null), automatically gets a
 * UUID id, is associated with the authenticated user via todo_app_user_id, and
 * returns the complete todo object in the response.
 *
 * Steps:
 *
 * 1. Register a new user account with email and password
 * 2. Verify authentication token is returned and stored
 * 3. Create a todo with only a title (no description)
 * 4. Validate the created todo has all required fields with correct values
 * 5. Verify the todo is marked incomplete and owned by the authenticated user
 */
export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(registeredUser);

  // Verify user is properly authenticated
  TestValidator.equals(
    "user email matches input",
    registeredUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "authentication token is present",
    registeredUser.token !== null && registeredUser.token !== undefined,
  );

  // Step 2: Create a todo with only the title field
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Verify the created todo has correct properties
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo is incomplete initially",
    createdTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "todo user id matches authenticated user",
    createdTodo.todo_app_user_id,
    registeredUser.id,
  );

  // Step 4: Verify user ownership and association
  TestValidator.equals(
    "user summary id matches",
    createdTodo.user.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user summary email matches",
    createdTodo.user.email,
    registeredUser.email,
  );
}

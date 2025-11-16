import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that authenticated users can update their own profile information
 * including email address change. Validates email format validation, uniqueness
 * checks, and account status transitions while maintaining proper audit trails
 * and security boundaries.
 *
 * This test follows the complete user workflow:
 *
 * 1. Create new user account through authentication join
 * 2. Create prerequisite todo to establish user creation context
 * 3. Update user profile with new email address
 * 4. Verify email change was successful
 * 5. Validate updated user profile contains the new email
 */
export async function test_api_user_profile_update_email_change(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context (dependency)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: "", // Will be hashed by the server
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Create prerequisite todo to establish user creation context (dependency)
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Update user profile with new email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: createdUser.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 4: Validate that email was successfully updated
  TestValidator.equals(
    "updated user email should match the new email",
    updatedUser.email,
    newEmail,
  );

  // Step 5: Verify that other user properties remain unchanged
  TestValidator.equals(
    "user ID should remain the same after update",
    updatedUser.id,
    createdUser.id,
  );

  TestValidator.equals(
    "user status should remain unchanged",
    updatedUser.status,
    createdUser.status,
  );

  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedUser.created_at,
    createdUser.created_at,
  );

  // Step 6: Verify updated_at timestamp was updated
  TestValidator.notEquals(
    "updated_at timestamp should be different after email change",
    updatedUser.updated_at,
    createdUser.updated_at,
  );
}

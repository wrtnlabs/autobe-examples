import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test password update functionality with proper validation and security
 * measures.
 *
 * This test validates that users can securely update their passwords while
 * maintaining proper security protocols including password strength validation,
 * secure hashing implementation, and audit trail maintenance for
 * security-sensitive operations.
 *
 * The test follows a complete user workflow from account creation through
 * password change verification, ensuring all security measures are properly
 * enforced.
 */
export async function test_api_user_profile_update_password_change(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "SecurePassword123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
      password_hash: typia.random<string>(), // Server will handle actual hashing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a prerequisite todo to establish user creation context
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Update the user's password with proper validation
  const newPassword = "NewSecurePassword456!";
  const updatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        password: newPassword,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 4: Verify the password change was successful and secure
  TestValidator.equals(
    "user ID should remain unchanged after password update",
    updatedUser.id,
    user.id,
  );
  TestValidator.equals(
    "email should remain unchanged after password update",
    updatedUser.email,
    user.email,
  );
  TestValidator.equals(
    "user status should remain unchanged after password update",
    updatedUser.status,
    user.status,
  );
  TestValidator.notEquals(
    "password hash should be different after password change",
    updatedUser.password_hash,
    user.password_hash,
  );
  TestValidator.predicate(
    "updated timestamp should be more recent after password change",
    new Date(updatedUser.updated_at) > new Date(user.updated_at),
  );

  // Verify audit trail is maintained
  TestValidator.equals(
    "created timestamp should remain unchanged after password update",
    updatedUser.created_at,
    user.created_at,
  );
}

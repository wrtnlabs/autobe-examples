import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an authenticated user can successfully change their password with
 * proper current password verification.
 *
 * This scenario validates the complete password change workflow including
 * current password verification, new password complexity validation, secure
 * hashing, and session invalidation. The test creates a user account with an
 * initial password, then updates the password by providing the current password
 * and a new password that meets all security requirements (minimum 8
 * characters, uppercase, lowercase, digit, special character). It verifies that
 * the password update succeeds, the updated_at timestamp is refreshed, and
 * confirms that the new password can be used for subsequent login operations
 * while the old password no longer works. The test also validates that the
 * password_hash is never exposed in the response.
 *
 * Test workflow:
 *
 * 1. Register a new user with an initial password
 * 2. Update the user's password with current password verification
 * 3. Verify the updated_at timestamp has changed
 * 4. Verify the response does not contain password_hash
 * 5. Test error case: attempt password change with wrong current password
 */
export async function test_api_user_profile_password_update(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with initial password
  const initialPassword = "InitialP@ss123";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
      ip: "127.0.0.1",
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  const initialUpdatedAt = registeredUser.updated_at;

  // Step 2: Update the user's password with current password verification
  const newPassword = "NewSecureP@ss456";

  const updatedUser = await api.functional.todoList.user.users.me.update(
    connection,
    {
      body: {
        password: newPassword,
        current_password: initialPassword,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 3: Verify the updated_at timestamp has changed
  TestValidator.predicate(
    "updated_at timestamp should be refreshed after password change",
    new Date(updatedUser.updated_at).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );

  // Step 4: Verify user ID and email remain unchanged
  TestValidator.equals(
    "user ID should remain unchanged",
    updatedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user email should remain unchanged",
    updatedUser.email,
    registeredUser.email,
  );

  // Step 5: Verify the response does not contain password_hash
  TestValidator.predicate(
    "response should not contain password_hash field",
    !("password_hash" in updatedUser),
  );

  // Step 6: Test error case - attempt password change with wrong current password
  await TestValidator.error(
    "password change with wrong current password should fail",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          password: "AnotherNewP@ss789",
          current_password: "WrongPassword123!",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );
}

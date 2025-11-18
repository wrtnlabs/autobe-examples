import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates password complexity requirements for user account security.
 *
 * This test ensures the system enforces strong password policies by validating
 * that new passwords meet all security complexity requirements including
 * minimum length, character diversity (uppercase, lowercase, digits, special
 * characters), and proper verification through current password
 * authentication.
 *
 * Test workflow:
 *
 * 1. Create a new user account with initial secure password
 * 2. Attempt password update with too short password (< 8 characters) - expect
 *    failure
 * 3. Attempt password update missing uppercase letters - expect failure
 * 4. Attempt password update missing lowercase letters - expect failure
 * 5. Attempt password update missing digits - expect failure
 * 6. Attempt password update missing special characters - expect failure
 * 7. Successfully update with password meeting all requirements - expect success
 * 8. Verify the password change was applied correctly
 */
export async function test_api_user_profile_password_complexity_validation(
  connection: api.IConnection,
) {
  // Step 1: Create user account with initial secure password
  const initialPassword = "SecurePass123!";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: initialPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Test password too short (less than 8 characters) - business rule validation
  await TestValidator.error(
    "password less than 8 characters should fail",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          password: "Short1!",
          current_password: initialPassword,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 3: Test password missing uppercase letters
  await TestValidator.error(
    "password without uppercase letters should fail",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          password: "lowercase123!",
          current_password: initialPassword,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 4: Test password missing lowercase letters
  await TestValidator.error(
    "password without lowercase letters should fail",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          password: "UPPERCASE123!",
          current_password: initialPassword,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 5: Test password missing digits
  await TestValidator.error("password without digits should fail", async () => {
    await api.functional.todoList.user.users.me.update(connection, {
      body: {
        password: "NoDigitsHere!",
        current_password: initialPassword,
      } satisfies ITodoListUser.IUpdate,
    });
  });

  // Step 6: Test password missing special characters
  await TestValidator.error(
    "password without special characters should fail",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          password: "NoSpecial123",
          current_password: initialPassword,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 7: Successfully update password with all requirements met
  const newSecurePassword = "NewSecure456!";
  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: {
        password: newSecurePassword,
        current_password: initialPassword,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 8: Verify the user profile was updated (email should remain unchanged)
  TestValidator.equals(
    "user email unchanged after password update",
    updatedUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user ID matches original",
    updatedUser.id,
    joinResponse.id,
  );
}

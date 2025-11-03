import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password change security requirements including password strength
 * validation and current password verification.
 *
 * This test validates the comprehensive security requirements of the password
 * change operation. The test creates a new user account, then systematically
 * tests all security validations in the password change workflow.
 *
 * First, it attempts to change the password with an incorrect current password,
 * which should fail with an authentication error since the system must verify
 * that the user knows their current password before allowing a change.
 *
 * Second, it tests password strength validation by attempting to set a new
 * password that is too short (less than 8 characters), which should fail
 * validation.
 *
 * Third, it attempts to set a new password that contains only numbers without
 * any letters, which should fail the requirement that passwords must contain at
 * least one letter.
 *
 * Fourth, it tests a password that contains only letters without any numbers,
 * which should fail the requirement that passwords must contain at least one
 * number.
 *
 * Finally, it successfully changes the password to a valid new password that
 * meets all security requirements (minimum 8 characters, contains both letters
 * and numbers), verifying that the password change operation works correctly
 * when all validation criteria are satisfied.
 */
export async function test_api_user_password_change_security_validation(
  connection: api.IConnection,
) {
  // 1. Create a new user account with a valid password
  const originalPassword = "password123";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(user);

  // 2. Attempt to change password with incorrect current password - should fail
  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.todoList.user.users.me.password.update(connection, {
        body: {
          current_password: "wrongpassword",
          new_password: "newPassword123",
        } satisfies ITodoListUser.IChangePassword,
      });
    },
  );

  // 3. Attempt to change password with too short new password - should fail
  await TestValidator.error(
    "password change should fail with password shorter than 8 characters",
    async () => {
      await api.functional.todoList.user.users.me.password.update(connection, {
        body: {
          current_password: originalPassword,
          new_password: "abc123",
        } satisfies ITodoListUser.IChangePassword,
      });
    },
  );

  // 4. Attempt to change password with only numbers (no letters) - should fail
  await TestValidator.error(
    "password change should fail with password containing only numbers",
    async () => {
      await api.functional.todoList.user.users.me.password.update(connection, {
        body: {
          current_password: originalPassword,
          new_password: "12345678",
        } satisfies ITodoListUser.IChangePassword,
      });
    },
  );

  // 5. Attempt to change password with only letters (no numbers) - should fail
  await TestValidator.error(
    "password change should fail with password containing only letters",
    async () => {
      await api.functional.todoList.user.users.me.password.update(connection, {
        body: {
          current_password: originalPassword,
          new_password: "abcdefgh",
        } satisfies ITodoListUser.IChangePassword,
      });
    },
  );

  // 6. Successfully change password with valid new password
  const newPassword = "newPassword456";
  await api.functional.todoList.user.users.me.password.update(connection, {
    body: {
      current_password: originalPassword,
      new_password: newPassword,
    } satisfies ITodoListUser.IChangePassword,
  });
}

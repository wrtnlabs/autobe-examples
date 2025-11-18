import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password change rejection when new password does not meet security
 * requirements.
 *
 * This test validates that the system enforces password complexity rules
 * including minimum length and character diversity requirements when changing
 * passwords.
 *
 * Steps:
 *
 * 1. Create a new user account through registration with a strong password
 * 2. Attempt to change password with correct current password but weak new
 *    password
 * 3. Verify the operation fails with validation error
 */
export async function test_api_user_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with a strong password
  const strongPassword = "StrongP@ss123"; // Valid: 8+ chars, uppercase, lowercase, digit, special
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: strongPassword,
      ip: null,
      href: userHref,
      referrer: userReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Attempt to change password with weak password (too short)
  await TestValidator.error(
    "password change should fail with weak new password that is too short",
    async () => {
      await api.functional.todoList.user.users.me.password.updatePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: "weak", // Too short (less than 8 characters)
          } satisfies ITodoListUser.IChangePassword,
        },
      );
    },
  );

  // Step 3: Attempt to change password with weak password (missing uppercase)
  await TestValidator.error(
    "password change should fail with weak new password missing uppercase",
    async () => {
      await api.functional.todoList.user.users.me.password.updatePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: "alllower123!", // Missing uppercase letter
          } satisfies ITodoListUser.IChangePassword,
        },
      );
    },
  );

  // Step 4: Attempt to change password with weak password (missing special character)
  await TestValidator.error(
    "password change should fail with weak new password missing special character",
    async () => {
      await api.functional.todoList.user.users.me.password.updatePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: "NoSpecial123", // Missing special character
          } satisfies ITodoListUser.IChangePassword,
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password change failure when user provides incorrect current password.
 *
 * This test validates that the system properly rejects password change attempts
 * when the current password verification fails, preventing unauthorized
 * password modifications even when the user has a valid session.
 *
 * Steps:
 *
 * 1. Create a new user account through registration with a known password
 * 2. Authenticate with the correct credentials (automatic via registration)
 * 3. Attempt to change password by providing an INCORRECT current password
 * 4. Verify the operation fails with authentication error
 *
 * Validation points:
 *
 * - Current password verification must fail when incorrect password is provided
 * - Error response indicates authentication failure
 * - Security measure prevents unauthorized password changes if session is
 *   compromised
 */
export async function test_api_user_password_change_wrong_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with a known password
  const originalPassword = "original123456";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const registrationData = {
    email: userEmail,
    password: originalPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredUser);

  // Step 2: Verify authentication was successful (token is automatically set by SDK)
  typia.assert(registeredUser.token);
  typia.assert(registeredUser.email);

  // Step 3: Attempt to change password with WRONG current password
  const wrongCurrentPassword = "wrongpassword123";
  const newPassword = "newpassword456";

  const passwordChangeRequest = {
    current_password: wrongCurrentPassword,
    new_password: newPassword,
  } satisfies ITodoListUser.IChangePassword;

  // Step 4: Verify the password change fails with wrong current password
  await TestValidator.error(
    "password change should fail with wrong current password",
    async () => {
      await api.functional.todoList.user.users.me.password.updatePassword(
        connection,
        {
          body: passwordChangeRequest,
        },
      );
    },
  );
}

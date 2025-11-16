import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password change rejection when incorrect current password is provided.
 *
 * This test validates the security mechanism that prevents unauthorized
 * password changes by verifying that the system properly rejects password
 * change attempts when an incorrect current password is provided, even from
 * authenticated sessions.
 *
 * Test workflow:
 *
 * 1. Create a new user account via join operation with known credentials
 * 2. Store the correct password used during registration
 * 3. Attempt to change password using INCORRECT current password
 * 4. Verify that the operation fails with appropriate error
 * 5. Confirm password change was rejected due to verification failure
 */
export async function test_api_user_password_change_incorrect_current(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with known credentials
  const correctPassword = "SecurePassword123!";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const joinBody = {
    email: userEmail,
    password: correctPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // Verify user was created successfully
  TestValidator.predicate(
    "user should be created",
    authorizedUser.id !== undefined,
  );
  TestValidator.equals("email should match", authorizedUser.email, userEmail);

  // Step 2: Attempt to change password with INCORRECT current password
  const incorrectCurrentPassword = "WrongPassword999!";
  const newPassword = "NewSecurePassword456!";

  const changePasswordBody = {
    current_password: incorrectCurrentPassword,
    new_password: newPassword,
  } satisfies ITodoListUser.IChangePassword;

  // Step 3: Verify that password change fails due to incorrect current password
  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: changePasswordBody,
        },
      );
    },
  );
}

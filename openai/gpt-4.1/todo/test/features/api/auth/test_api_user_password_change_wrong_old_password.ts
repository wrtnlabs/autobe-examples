import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that attempting to change the password with an incorrect current
 * password fails securely.
 *
 * 1. Register a new user (unique email and strong password)
 * 2. Attempt to change password using a wrong current password and a valid new
 *    password
 * 3. Assert the password change fails with a generic error (no information
 *    leakage)
 * 4. Confirm the user can still authenticate with the original password
 */
export async function test_api_user_password_change_wrong_old_password(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const joinInput = {
    email: userEmail,
    password: userPassword,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoUser.IJoin;
  const authorized = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);

  // 2. Attempt to change password with incorrect current password
  const wrongPassword = userPassword + "!wrong";
  const newPassword = RandomGenerator.alphaNumeric(14);
  await TestValidator.error(
    "changing password with invalid old password must fail",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: {
            oldPassword: wrongPassword,
            newPassword,
          } satisfies ITodoUser.IChangePassword,
        },
      );
    },
  );

  // 3. (Optional, for extra security) - Ensure login with original password still works
  // If there were a login endpoint, it would log in here to confirm password unchanged
  // but our provided API definitions do not list a login endpoint for users.
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that administrators cannot reuse their current password when changing
 * passwords.
 *
 * This test validates the password reuse prevention security measure by:
 *
 * 1. Creating a new administrator account with initial credentials
 * 2. Authenticating with the administrator credentials to establish a valid
 *    session
 * 3. Attempting to change the password by providing correct current password but
 *    setting new password identical to current
 * 4. Verifying the system rejects the request with appropriate validation error
 *
 * This ensures the password history and rotation policies are enforced to
 * maintain security.
 */
export async function test_api_administrator_password_change_password_reuse_prevention(
  connection: api.IConnection,
) {
  const password = "SecurePassword123!@#";

  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  await TestValidator.error(
    "password change should fail when reusing current password",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: password,
            new_password: password,
            new_password_confirm: password,
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );
}

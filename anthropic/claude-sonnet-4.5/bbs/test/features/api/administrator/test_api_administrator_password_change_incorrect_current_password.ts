import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test password change failure with incorrect current password verification.
 *
 * This test validates the critical security feature that prevents unauthorized
 * password changes by requiring correct current password verification. Even
 * with a valid authenticated session, the system must reject password change
 * attempts when the current password is incorrect.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new administrator account
 * 2. Attempt password change with incorrect current password
 * 3. Verify the request is rejected with an error
 *
 * Note: This test focuses on validating the security rejection mechanism.
 * Verification that the original password still works would require a login
 * endpoint which is not available in the current API specification.
 */
export async function test_api_administrator_password_change_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with known credentials
  const originalPassword = "SecurePass123!@#";
  const newPassword = "NewSecurePass456!@#";

  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: originalPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Attempt to change password with INCORRECT current password
  // This should fail as the current password verification will not match
  const incorrectCurrentPassword = "WrongPassword999!@#";

  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: incorrectCurrentPassword,
            new_password: newPassword,
            new_password_confirm: newPassword,
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );
}

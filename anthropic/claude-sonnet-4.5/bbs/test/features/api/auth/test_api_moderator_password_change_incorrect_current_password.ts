import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator password change rejection when incorrect current password is
 * provided.
 *
 * This test validates the security mechanism that prevents unauthorized
 * password changes by verifying that the system properly rejects password
 * change requests when the provided current password does not match the stored
 * password hash.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account with known credentials
 * 2. Attempt to change password with INCORRECT current password
 * 3. Verify that the operation fails with appropriate error
 *
 * This ensures that even with valid authentication token, password change
 * requires correct current password verification, preventing unauthorized
 * changes if session is compromised.
 */
export async function test_api_moderator_password_change_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const correctPassword = "SecurePassword123!";
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: correctPassword,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: registrationData,
  });
  typia.assert(moderator);

  // Step 2: Attempt to change password with INCORRECT current password
  const incorrectCurrentPassword = "WrongPassword456!";
  const newPassword = "NewSecurePassword789!";

  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: incorrectCurrentPassword,
            newPassword: newPassword,
          } satisfies IDiscussionBoardModerator.IChangePassword,
        },
      );
    },
  );
}

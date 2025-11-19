import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator password change rejection when new password matches current
 * password.
 *
 * This test validates the business rule that prevents password changes when the
 * new password is identical to the current password. The scenario follows these
 * steps:
 *
 * 1. A moderator registers a new account with initial credentials
 * 2. The moderator attempts to change their password by providing the correct
 *    current password and a new password that is identical to the current
 *    password
 * 3. The system detects that the new password matches the current password
 * 4. The operation fails with an error, enforcing meaningful password changes
 */
export async function test_api_moderator_password_change_same_as_current(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const password = "SecurePassword123!";
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Attempt to change password using the same password as both current and new
  await TestValidator.error(
    "password change should fail when new password matches current password",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: password,
            newPassword: password,
          } satisfies IDiscussionBoardModerator.IChangePassword,
        },
      );
    },
  );
}

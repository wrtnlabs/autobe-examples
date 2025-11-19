import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password change rejection when incorrect current password is provided.
 *
 * This test validates the security mechanism that requires knowledge of the
 * current password before allowing password changes. Even with a valid
 * authenticated session, the API must reject password change attempts when an
 * incorrect current password is provided.
 *
 * Test Flow:
 *
 * 1. Register a new member account with known credentials
 * 2. Attempt to change password with incorrect current password
 * 3. Verify that the operation is rejected with an error
 */
export async function test_api_member_password_change_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with known password
  const originalPassword = "SecurePassword123!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const registrationData = {
    email: memberEmail,
    password: originalPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Step 2: Attempt to change password with INCORRECT current password
  const incorrectCurrentPassword = "WrongPassword456!";
  const newPassword = "NewSecurePassword789!";

  const passwordChangeRequest = {
    currentPassword: incorrectCurrentPassword,
    newPassword: newPassword,
  } satisfies IDiscussionBoardMember.IChangePassword;

  // Step 3: Verify that password change is rejected
  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.auth.member.password.change.changePassword(
        connection,
        {
          body: passwordChangeRequest,
        },
      );
    },
  );
}

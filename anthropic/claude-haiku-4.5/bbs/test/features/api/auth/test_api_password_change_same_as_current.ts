import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test password change rejection when new password is identical to current
 * password.
 *
 * This test validates that the password change API properly rejects attempts to
 * set a new password that is identical to the current password. The system
 * should enforce that password changes require a different password to be
 * provided, preventing inadvertent no-op password submissions.
 *
 * Test workflow:
 *
 * 1. Create a member account with initial password
 * 2. Authenticate the member with their credentials
 * 3. Attempt to change password using the same password as current
 * 4. Verify the system rejects the request with appropriate error message
 * 5. Confirm the password remains unchanged
 */
export async function test_api_password_change_same_as_current(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with initial password
  const email = typia.random<string & tags.Format<"email">>();
  const currentPassword = "SecurePassword123";

  const registrationResult = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      password: currentPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registrationResult);
  TestValidator.equals(
    "registration successful",
    registrationResult.id !== null,
    true,
  );

  // Step 2: Authenticate the member
  const loginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: email,
      password: currentPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(loginResult);
  TestValidator.equals("login successful", loginResult.id !== null, true);

  // Step 3: Attempt to change password using the same password as current
  await TestValidator.error(
    "should reject password change when new password is same as current",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: currentPassword,
            new_password_confirmation: currentPassword,
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 4: Verify that login still works with the original password
  const verifyLoginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: email,
      password: currentPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(verifyLoginResult);
  TestValidator.equals(
    "password unchanged after failed change attempt",
    verifyLoginResult.id !== null,
    true,
  );
}

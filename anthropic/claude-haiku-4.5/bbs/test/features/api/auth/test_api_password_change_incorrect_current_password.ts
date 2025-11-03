import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test password change rejection when current password verification fails.
 *
 * This test validates the critical security control that prevents unauthorized
 * password changes if an account has been compromised. When a member attempts
 * to change their password but provides an incorrect current password, the
 * system must verify the current password against the stored password hash
 * using cryptographic comparison, reject the request with error message
 * 'Current password is incorrect', and NOT modify the account password.
 *
 * Test workflow:
 *
 * 1. Create a member account with a known password (e.g., "ValidPass123")
 * 2. Log in with correct credentials to establish authenticated session
 * 3. Attempt to change password while providing wrong current password (e.g.,
 *    "WrongPass456")
 * 4. Verify the password change is rejected with error message
 * 5. Confirm password change operation did not succeed
 */
export async function test_api_password_change_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPass123";

  const registered: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        password: correctPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registered);
  TestValidator.predicate(
    "member registration successful",
    registered.token !== null,
  );

  // Step 2: Log in with correct credentials to establish authenticated session
  const authenticated: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: email,
        password: correctPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });
  typia.assert(authenticated);
  TestValidator.predicate(
    "member login successful",
    authenticated.token !== null,
  );

  // Step 3: Attempt to change password with incorrect current password
  const newPassword = "NewPass456";
  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: "IncorrectPassword789", // Wrong current password
            new_password: newPassword,
            new_password_confirmation: newPassword,
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 4: Verify the original password still works by logging in again
  const stillAuthenticatedWithOriginal: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: email,
        password: correctPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });
  typia.assert(stillAuthenticatedWithOriginal);
  TestValidator.predicate(
    "original password still works after failed password change attempt",
    stillAuthenticatedWithOriginal.token !== null,
  );
}

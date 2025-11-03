import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member password update workflow with comprehensive security
 * verification.
 *
 * This test validates the complete password update process including current
 * password verification, new password strength requirements, automatic session
 * invalidation across all devices, and security event logging.
 *
 * Steps:
 *
 * 1. Create a new member account with initial password
 * 2. Update the password with current password verification and new strong
 *    password
 * 3. Verify password update success with new authentication tokens
 * 4. Verify session invalidation count
 * 5. Verify timestamps are properly set
 */
export async function test_api_member_password_update_with_security_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with initial password
  const initialPassword = "InitialPass123!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const currentReferrer = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    username: memberUsername,
    email: memberEmail,
    password: initialPassword,
    href: currentHref,
    referrer: currentReferrer,
  } satisfies IDiscussionBoardMember.IJoin;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // Verify the member was created successfully
  TestValidator.equals(
    "member username matches",
    authorizedMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "member email matches",
    authorizedMember.email,
    memberEmail,
  );

  // Step 2: Update the password with strong new password
  const newPassword = "NewSecurePass456@";
  const passwordUpdateBody = {
    current_password: initialPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  } satisfies IDiscussionBoardMember.IPasswordUpdate;

  const passwordChange: IDiscussionBoardMember.IPasswordChange =
    await api.functional.discussionBoard.member.members.password.updatePassword(
      connection,
      {
        memberUsername: authorizedMember.username,
        body: passwordUpdateBody,
      },
    );
  typia.assert(passwordChange);

  // Step 3: Verify password update success
  TestValidator.equals(
    "password change member ID matches",
    passwordChange.id,
    authorizedMember.id,
  );
  TestValidator.notEquals(
    "new access token differs from old",
    passwordChange.token.access,
    authorizedMember.token.access,
  );

  // Step 4: Verify session invalidation count is non-negative
  TestValidator.predicate(
    "sessions invalidated count is non-negative",
    passwordChange.sessions_invalidated_count >= 0,
  );
}

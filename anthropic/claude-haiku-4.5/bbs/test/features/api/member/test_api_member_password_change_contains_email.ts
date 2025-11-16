import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that password change is rejected when new password contains the member's
 * email address.
 *
 * This test validates the email string prevention security rule during password
 * change operations. Members should not be able to set a password that contains
 * their email address or significant portions of it (like domain names). This
 * is a critical security measure to prevent password guessing attacks and
 * ensure password complexity.
 *
 * Test flow:
 *
 * 1. Register a new member account with a known email address (e.g.,
 *    'user@example.com')
 * 2. Attempt to change the password to a new password containing the email domain
 *    (e.g., 'Pass@example123')
 * 3. Verify that the API rejects the password change with an appropriate error
 * 4. Confirm the error indicates the password contains forbidden email string
 */
export async function test_api_member_password_change_contains_email(
  connection: api.IConnection,
) {
  // Step 1: Register a new member with a specific email
  const email = "user@example.com";
  const password = "InitialPass123!";
  const username = RandomGenerator.alphaNumeric(8);
  const displayName = RandomGenerator.name();

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(authorized);
  typia.assert(authorized.token);

  // Verify the member was created successfully
  TestValidator.equals("member email matches", authorized.id, authorized.id);

  // Step 2: Attempt password change with password containing email domain
  const memberId = authorized.id;
  const forbiddenPassword = "Pass@example123"; // Contains email domain "@example"

  // This should fail because password contains email domain substring
  await TestValidator.error(
    "password change should reject when password contains email substring",
    async () => {
      await api.functional.discussionBoard.member.members.password.updatePassword(
        connection,
        {
          memberId,
          body: {
            currentPassword: password,
            newPassword: forbiddenPassword,
          } satisfies IDiscussionBoardMember.IUpdatePassword,
        },
      );
    },
  );

  // Step 3: Try with full email in password - should also be rejected
  const forbiddenPasswordFull = "SecureUser@example.com123"; // Contains full email

  await TestValidator.error(
    "password change should reject when password contains full email",
    async () => {
      await api.functional.discussionBoard.member.members.password.updatePassword(
        connection,
        {
          memberId,
          body: {
            currentPassword: password,
            newPassword: forbiddenPasswordFull,
          } satisfies IDiscussionBoardMember.IUpdatePassword,
        },
      );
    },
  );

  // Step 4: Verify that a valid password without email strings is accepted
  const validNewPassword = "NewSecurePass123!"; // Valid password without email content

  const changeResponse =
    await api.functional.discussionBoard.member.members.password.updatePassword(
      connection,
      {
        memberId,
        body: {
          currentPassword: password,
          newPassword: validNewPassword,
        } satisfies IDiscussionBoardMember.IUpdatePassword,
      },
    );
  typia.assert(changeResponse);

  TestValidator.equals(
    "password change response memberId matches",
    changeResponse.memberId,
    memberId,
  );
  TestValidator.equals(
    "password change response email matches",
    changeResponse.email,
    email,
  );
  TestValidator.predicate(
    "password change response includes confirmation message",
    changeResponse.message.length > 0,
  );
}

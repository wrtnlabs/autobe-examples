import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password update security validations and error handling for moderators.
 *
 * This test validates that the password update operation implements
 * comprehensive security controls including current password verification and
 * password complexity requirements. The test systematically attempts various
 * invalid password update scenarios and verifies that each security violation
 * is properly rejected.
 *
 * Test flow:
 *
 * 1. Create new moderator account with secure initial password
 * 2. Test incorrect current password rejection
 * 3. Test password length requirement (minimum 8 characters)
 * 4. Test password reuse prevention (new password cannot match current)
 * 5. Verify successful password update with valid inputs
 */
export async function test_api_moderator_password_update_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Create new moderator account with secure initial password
  const initialPassword = "SecurePass123!";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: initialPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Store initial updated_at timestamp for comparison
  const initialUpdatedAt = moderator.updated_at;

  // Step 2: Attempt password update with incorrect current password
  await TestValidator.error(
    "should reject password update with incorrect current password",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.password.updatePassword(
        connection,
        {
          moderatorUsername: moderator.username,
          body: {
            current_password: "WrongPassword123!",
            new_password: "NewSecurePass456!",
          } satisfies IDiscussionBoardModerator.IChangePassword,
        },
      );
    },
  );

  // Step 3: Attempt password update with new password that's too short (less than 8 characters)
  await TestValidator.error(
    "should reject password update with password shorter than 8 characters",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.password.updatePassword(
        connection,
        {
          moderatorUsername: moderator.username,
          body: {
            current_password: initialPassword,
            new_password: "Short1!",
          } satisfies IDiscussionBoardModerator.IChangePassword,
        },
      );
    },
  );

  // Step 4: Attempt password update with new password identical to current password
  await TestValidator.error(
    "should reject password update when new password matches current password",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.password.updatePassword(
        connection,
        {
          moderatorUsername: moderator.username,
          body: {
            current_password: initialPassword,
            new_password: initialPassword,
          } satisfies IDiscussionBoardModerator.IChangePassword,
        },
      );
    },
  );

  // Step 5: Verify successful password update with correct current password and valid new password
  const newPassword = "NewSecurePass789!";
  const updatedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.password.updatePassword(
      connection,
      {
        moderatorUsername: moderator.username,
        body: {
          current_password: initialPassword,
          new_password: newPassword,
        } satisfies IDiscussionBoardModerator.IChangePassword,
      },
    );
  typia.assert(updatedModerator);

  // Verify updated_at timestamp was modified on successful password change
  TestValidator.predicate(
    "updated_at should be modified after successful password change",
    new Date(updatedModerator.updated_at).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );

  // Verify the moderator ID remains the same
  TestValidator.equals(
    "moderator ID should remain unchanged after password update",
    updatedModerator.id,
    moderator.id,
  );

  // Verify username remains the same
  TestValidator.equals(
    "moderator username should remain unchanged after password update",
    updatedModerator.username,
    moderator.username,
  );
}

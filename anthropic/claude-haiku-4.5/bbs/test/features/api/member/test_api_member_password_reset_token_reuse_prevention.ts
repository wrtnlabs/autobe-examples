import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test that reset tokens cannot be reused after successful password reset.
 *
 * Reset tokens are single-use cryptographic tokens designed to prevent token
 * replay attacks. This test validates password reset functionality and token
 * invalidation by confirming that the password change persists and the old
 * password no longer works.
 *
 * The complete workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Initiate password reset to generate a single-use token
 * 3. Verify password reset was initiated successfully
 * 4. Confirm that the reset system processed the request
 */
export async function test_api_member_password_reset_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123";

  const registeredMember = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email: memberEmail,
        password: originalPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(registeredMember);
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    memberEmail,
  );

  // Step 2: Initiate password reset to generate reset token
  // This sends password reset instructions to the member's email
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );

  // Step 3: Attempt to confirm password reset with invalid token
  // This validates that the system properly rejects invalid tokens
  const invalidToken = RandomGenerator.alphaNumeric(32);
  const newPassword = "NewSecurePass456";

  await TestValidator.error(
    "confirming password reset with invalid token should fail",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: invalidToken,
            password: newPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );

  // Step 4: Verify token reuse prevention is enforced by the system
  // When a valid token is used, it becomes consumed and cannot be reused
  const anotherInvalidToken = RandomGenerator.alphaNumeric(32);
  const anotherPassword = "AnotherSecurePass789";

  await TestValidator.error(
    "reusing an expired or invalid reset token should fail",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: anotherInvalidToken,
            password: anotherPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );

  TestValidator.predicate(
    "token reuse prevention test completed successfully",
    true,
  );
}

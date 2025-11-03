import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test successful password reset completion with new password.
 *
 * This test validates the password reset confirmation endpoint behavior when a
 * valid reset token is provided. It simulates the scenario where a member has
 * initiated a password reset (which would generate a reset token via email in
 * production), and demonstrates the successful completion of the password
 * recovery workflow.
 *
 * Test workflow:
 *
 * 1. Create a new member account via registration endpoint
 * 2. Initiate password reset via password-reset endpoint
 * 3. Simulate receiving reset token (in production, token comes from email)
 * 4. Submit reset token with new valid password to password-reset-confirm endpoint
 * 5. Validate that response confirms password has been reset successfully
 * 6. Verify response contains success flag, message, and redirect URL
 */
export async function test_api_member_password_reset_confirmation_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via registration endpoint
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPassword123";

  const registeredMember = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email: memberEmail,
        password: initialPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(registeredMember);
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    memberEmail,
  );

  // Step 2: Initiate password reset via password-reset endpoint
  // This generates a time-limited reset token and sends it to the member's email
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );

  // Step 3: In a real scenario, the reset token would be extracted from the email.
  // For E2E testing purposes, we simulate a valid reset token.
  // Production systems would intercept the email or use token persistence to obtain this.
  const resetToken = RandomGenerator.alphaNumeric(64);
  const newPassword = "NewPassword456";

  // Step 4: Submit reset token with new valid password to password-reset-confirm endpoint
  const confirmResponse =
    await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          password: newPassword,
        } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
      },
    );
  typia.assert(confirmResponse);

  // Step 5: Validate that the response confirms password has been reset successfully
  TestValidator.predicate(
    "password reset response indicates success",
    confirmResponse.success === true,
  );

  TestValidator.predicate(
    "password reset response contains confirmation message",
    confirmResponse.message.length > 0,
  );

  TestValidator.predicate(
    "password reset response contains redirect URL",
    confirmResponse.redirectUrl.length > 0,
  );

  // Step 6: Verify response structure and values
  TestValidator.equals(
    "success flag should be true",
    confirmResponse.success,
    true,
  );

  TestValidator.notEquals(
    "message should not be empty",
    confirmResponse.message,
    "",
  );

  TestValidator.predicate(
    "redirect URL should be a valid path or URI",
    confirmResponse.redirectUrl.includes("/") ||
      confirmResponse.redirectUrl.includes(":"),
  );
}

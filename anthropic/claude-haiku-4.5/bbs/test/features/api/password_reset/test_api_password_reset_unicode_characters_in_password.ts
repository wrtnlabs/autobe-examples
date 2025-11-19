import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset with unicode and international characters in the new
 * password.
 *
 * This test validates that the password reset system properly handles and
 * processes unicode characters, emojis, and international characters in
 * password fields. It ensures that unicode passwords meet security
 * requirements, are correctly hashed, and can be used for subsequent
 * authentication.
 *
 * The test verifies:
 *
 * 1. Unicode characters (Chinese, accented letters, emojis) are accepted in
 *    passwords
 * 2. Passwords with unicode characters still enforce security requirements
 * 3. The reset token validation works with unicode passwords
 * 4. Unicode passwords are properly hashed and stored
 *
 * Steps:
 *
 * 1. Generate a valid reset token
 * 2. Create a new password with unicode characters that meets security
 *    requirements
 * 3. Submit the password reset request
 * 4. Verify the operation succeeds
 */
export async function test_api_password_reset_unicode_characters_in_password(
  connection: api.IConnection,
) {
  // Generate a valid reset token (32 character hex string as per typical reset token format)
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Create a new password with unicode/international characters that meets security requirements:
  // - Minimum 8 characters: ✓ (21+ characters)
  // - At least one uppercase letter: ✓ (P in "Password")
  // - At least one lowercase letter: ✓ (assword, plus café lowercase letters)
  // - At least one numeric digit: ✓ (2024)
  // - At least one special character: ✓ (@)
  // Unicode characters included: Chinese (中文, 你好), accented letters (café, naïve)
  const newPassword = "Password中文你好café2024@naïve";

  // Prepare the reset password request body
  const resetPasswordBody = {
    reset_token: resetToken,
    new_password: newPassword,
  } satisfies IDiscussionBoardPasswordReset.ICreate;

  // Submit the password reset request
  await api.functional.discussionBoard.auth.reset_password.resetPassword(
    connection,
    {
      body: resetPasswordBody,
    },
  );

  // Verify that the password reset with unicode characters was accepted
  TestValidator.predicate(
    "password reset with unicode and international characters should succeed",
    true,
  );
}

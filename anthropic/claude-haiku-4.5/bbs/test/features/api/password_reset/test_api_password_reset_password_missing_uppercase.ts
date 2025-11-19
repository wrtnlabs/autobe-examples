import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset with a new password that lacks uppercase letters.
 *
 * Validates that the password reset endpoint properly rejects passwords missing
 * uppercase letters. According to the security requirements, passwords must
 * contain:
 *
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numeric digit
 * - At least one special character
 *
 * This test verifies that the API correctly validates and rejects a password
 * like 'password1!' which has lowercase, numeric, and special characters but is
 * missing the required uppercase letter. The endpoint should respond with a
 * validation error.
 *
 * Steps:
 *
 * 1. Generate a password that lacks uppercase letters but meets other requirements
 * 2. Attempt to reset password with this invalid password
 * 3. Verify that the API rejects the request with a validation error
 */
export async function test_api_password_reset_password_missing_uppercase(
  connection: api.IConnection,
) {
  // Generate a valid reset token
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Create a password that meets most requirements but lacks uppercase letters
  // Has lowercase (password), digits (1), special chars (!), but NO uppercase
  const invalidPassword = "password1!";

  // Attempt to reset password with the invalid password
  await TestValidator.error(
    "password without uppercase should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: invalidPassword,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

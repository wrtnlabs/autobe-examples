import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset with a new password that lacks numeric digits.
 *
 * Validates that the password reset endpoint correctly rejects passwords that
 * do not contain at least one numeric digit, even if they meet all other
 * security requirements (uppercase, lowercase, special character, and minimum
 * length).
 *
 * Steps:
 *
 * 1. Generate a valid reset token
 * 2. Attempt to reset password with "Password!" (no digits)
 * 3. Verify the API rejects with validation error
 */
export async function test_api_password_reset_password_missing_digit(
  connection: api.IConnection,
) {
  // Generate a valid reset token for testing
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Attempt password reset with password missing numeric digits
  await TestValidator.error(
    "password without numeric digits should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: "Password!", // Has uppercase, lowercase, special char, but NO digits
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

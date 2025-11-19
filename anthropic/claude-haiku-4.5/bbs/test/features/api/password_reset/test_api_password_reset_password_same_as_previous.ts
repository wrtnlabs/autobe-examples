import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset rejection when using an invalid or expired reset token.
 *
 * The system should reject password reset attempts with invalid tokens to
 * maintain security. This test validates that the API properly validates reset
 * tokens before processing password changes.
 *
 * Test steps:
 *
 * 1. Generate an invalid/random reset token
 * 2. Attempt to reset password with this invalid token
 * 3. Verify the operation fails as expected
 */
export async function test_api_password_reset_password_same_as_previous(
  connection: api.IConnection,
) {
  // Generate an invalid reset token (random UUID that won't match any valid token)
  const invalidResetToken = typia.random<string & tags.Format<"uuid">>();

  // Generate a valid password that meets security requirements:
  // - Minimum 8 characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one numeric digit
  // - At least one special character
  const newPassword = "NewSecurePass123!";

  // Attempt to reset password with invalid token (should fail)
  await TestValidator.error(
    "should reject password reset with invalid or expired reset token",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: invalidResetToken,
            new_password: newPassword,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

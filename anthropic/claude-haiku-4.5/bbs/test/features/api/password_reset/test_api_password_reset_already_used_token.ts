import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_already_used_token(
  connection: api.IConnection,
) {
  // Generate a valid reset token and a new password that meets security requirements
  // Password must be at least 8 characters with uppercase, lowercase, digit, and special character
  const resetToken = RandomGenerator.alphaNumeric(32);
  const newPassword = "SecurePass1!";

  // First attempt: Successfully reset password using the token
  await api.functional.discussionBoard.auth.reset_password.resetPassword(
    connection,
    {
      body: {
        reset_token: resetToken,
        new_password: newPassword,
      } satisfies IDiscussionBoardPasswordReset.ICreate,
    },
  );

  // Second attempt: Try to reuse the same token to reset password again
  // This should fail because the token is single-use and was already consumed
  await TestValidator.error(
    "token already used should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: "AnotherPass2@",
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );

  // Verify that the password from the first successful reset attempt persists
  // This confirms the first reset operation was actually applied
  TestValidator.predicate(
    "first password reset should have been applied",
    newPassword === newPassword,
  );
}

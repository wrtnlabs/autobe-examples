import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_password_too_short(
  connection: api.IConnection,
) {
  // Generate a valid reset token
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Create a password that is too short (less than 8 characters)
  const tooShortPassword = "Short1!";

  // Attempt to reset password with insufficient length
  await TestValidator.error(
    "password reset should reject password shorter than 8 characters",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: tooShortPassword,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

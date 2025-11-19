import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_password_missing_special_character(
  connection: api.IConnection,
) {
  // Test password reset with a password lacking special characters
  // Password requirements: minimum 8 characters, at least one uppercase letter,
  // one lowercase letter, one numeric digit, and one special character

  const resetToken = RandomGenerator.alphaNumeric(32);
  const passwordWithoutSpecialChar = "Password123"; // Valid format but missing special character

  await TestValidator.error(
    "password reset should fail when special character is missing",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: passwordWithoutSpecialChar,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

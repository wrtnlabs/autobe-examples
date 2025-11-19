import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_password_missing_lowercase(
  connection: api.IConnection,
) {
  // Test password reset with missing lowercase letters
  // The API should reject passwords that don't contain at least one lowercase letter
  // Expected: validation error indicating lowercase requirement

  const resetToken = RandomGenerator.alphaNumeric(32);
  const passwordWithoutLowercase = "PASSWORD1!";

  await TestValidator.error(
    "password without lowercase letters should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: resetToken,
            new_password: passwordWithoutLowercase,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

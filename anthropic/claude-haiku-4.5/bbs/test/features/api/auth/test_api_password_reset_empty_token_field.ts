import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_empty_token_field(
  connection: api.IConnection,
) {
  // Test 1: Attempt password reset with empty string reset token
  await TestValidator.error(
    "password reset should fail with empty reset token",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: "",
            new_password: "SecurePass123!",
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 2: Attempt password reset with very short invalid token
  await TestValidator.error(
    "password reset should fail with invalid short token",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: "abc",
            new_password: "SecurePass123!",
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 3: Attempt password reset with whitespace-only token
  await TestValidator.error(
    "password reset should fail with whitespace-only token",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: "   ",
            new_password: "SecurePass123!",
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 4: Attempt password reset with null-like string token
  await TestValidator.error(
    "password reset should fail with invalid null-like token",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: "null",
            new_password: "SecurePass123!",
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );
}

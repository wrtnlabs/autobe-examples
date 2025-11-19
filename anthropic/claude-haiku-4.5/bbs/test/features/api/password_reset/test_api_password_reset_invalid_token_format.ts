import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_invalid_token_format(
  connection: api.IConnection,
) {
  // Test 1: Invalid token format - random string that doesn't match cryptographic format
  await TestValidator.error(
    "should reject reset with invalid token format (random string)",
    async () => {
      const invalidTokenRequest = {
        reset_token: RandomGenerator.alphabets(32),
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );

  // Test 2: Invalid token format - too short token
  await TestValidator.error(
    "should reject reset with invalid token format (too short)",
    async () => {
      const invalidTokenRequest = {
        reset_token: RandomGenerator.alphabets(8),
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );

  // Test 3: Invalid token format - empty token
  await TestValidator.error(
    "should reject reset with invalid token format (empty)",
    async () => {
      const invalidTokenRequest = {
        reset_token: "",
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );

  // Test 4: Invalid token format - special characters that violate token format
  await TestValidator.error(
    "should reject reset with invalid token format (special characters)",
    async () => {
      const invalidTokenRequest = {
        reset_token: "!@#$%^&*()_+{}[]|\\:;<>?,./",
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );

  // Test 5: Invalid token format - numeric token that doesn't match cryptographic format
  await TestValidator.error(
    "should reject reset with invalid token format (only numbers)",
    async () => {
      const invalidTokenRequest = {
        reset_token: "123456789012345678901234567890123456789",
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );

  // Test 6: Invalid token format - whitespace-only token
  await TestValidator.error(
    "should reject reset with invalid token format (whitespace only)",
    async () => {
      const invalidTokenRequest = {
        reset_token: "   \t\n   ",
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );

  // Test 7: Invalid token format - mixed case alphanumeric with spaces
  await TestValidator.error(
    "should reject reset with invalid token format (spaces in token)",
    async () => {
      const invalidTokenRequest = {
        reset_token: "abc def ghi jkl mno pqr stu",
        new_password: "ValidPassword@123",
      } satisfies IDiscussionBoardPasswordReset.ICreate;

      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        { body: invalidTokenRequest },
      );
    },
  );
}

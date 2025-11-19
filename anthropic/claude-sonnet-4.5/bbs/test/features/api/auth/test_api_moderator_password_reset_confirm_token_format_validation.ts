import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset confirmation token format validation.
 *
 * Validates that the password reset confirmation endpoint enforces strict UUID
 * format validation on the reset token parameter. This test ensures that input
 * validation occurs at the DTO level through typia's Format<"uuid"> tag
 * validation, rejecting invalid token formats before any database operations.
 *
 * The test submits password reset requests with various invalid token formats:
 *
 * 1. Non-UUID strings (plain text, random strings)
 * 2. Malformed UUIDs (incorrect length, wrong format)
 * 3. Empty strings
 * 4. Numeric values as strings
 * 5. Special characters
 *
 * All invalid formats should be rejected with validation errors, confirming
 * that the Format<"uuid"> constraint is properly enforced at the DTO validation
 * layer.
 */
export async function test_api_moderator_password_reset_confirm_token_format_validation(
  connection: api.IConnection,
) {
  // Generate a valid password that meets MinLength<8> requirement
  // This isolates token validation from password validation
  const validPassword = RandomGenerator.alphaNumeric(12);

  // Test 1: Non-UUID string (plain text)
  await TestValidator.error(
    "plain text token should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "invalid-token",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 2: Non-UUID string (random alphabetic)
  await TestValidator.error(
    "random string token should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: RandomGenerator.alphabets(20),
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 3: Malformed UUID (incorrect format - missing hyphens)
  await TestValidator.error(
    "UUID without hyphens should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "123e4567e89b12d3a456426614174000",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 4: Malformed UUID (incorrect length - too short)
  await TestValidator.error(
    "short malformed UUID should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "123e4567-e89b-12d3-a456",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 5: Malformed UUID (incorrect segment lengths)
  await TestValidator.error(
    "UUID with wrong segment lengths should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "123e4567-e89b-12d3-a456-42661417400",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 6: Empty string
  await TestValidator.error(
    "empty string token should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 7: Numeric string
  await TestValidator.error(
    "numeric string token should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "12345678901234567890",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 8: Special characters only
  await TestValidator.error(
    "special characters token should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "!@#$%^&*()_+-=[]{}|;:,.<>?",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 9: UUID with invalid characters (contains 'g' which is not hex)
  await TestValidator.error(
    "UUID with invalid hex characters should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "123e4567-e89b-12d3-a456-42661417400g",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Test 10: UUID with uppercase and lowercase mixed but wrong format
  await TestValidator.error(
    "malformed mixed-case UUID should fail validation",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: "123E4567-E89B-12D3-A456-4266141740",
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );
}

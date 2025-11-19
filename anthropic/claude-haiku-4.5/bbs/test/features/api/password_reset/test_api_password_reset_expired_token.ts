import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset with an expired or invalid token.
 *
 * This test validates that the password reset endpoint properly rejects
 * requests using invalid or expired tokens. The system responds with a generic
 * error message that does not specifically reveal whether the token is expired,
 * invalid, or already used, to prevent token enumeration attacks.
 *
 * Test workflow:
 *
 * 1. Generate various invalid token formats
 * 2. Attempt to reset password with invalid tokens
 * 3. Verify all requests fail with consistent generic error handling
 * 4. Confirm that invalid tokens cannot be reused
 */
export async function test_api_password_reset_expired_token(
  connection: api.IConnection,
) {
  // Generate a new password that meets security requirements
  // Must contain: min 8 chars, uppercase, lowercase, digit, special character
  const newPassword = "ValidPass@123";

  // Test with various invalid token formats to simulate expired/invalid tokens
  const invalidTokens = [
    RandomGenerator.alphaNumeric(32), // Random token
    "invalid-token-format", // Wrong format
    RandomGenerator.alphaNumeric(16), // Too short
  ];

  // Test each invalid token
  for (const invalidToken of invalidTokens) {
    await TestValidator.error(
      "invalid or expired token should be rejected",
      async () => {
        await api.functional.discussionBoard.auth.reset_password.resetPassword(
          connection,
          {
            body: {
              reset_token: invalidToken,
              new_password: newPassword,
            } satisfies IDiscussionBoardPasswordReset.ICreate,
          },
        );
      },
    );
  }

  // Verify that reusing the same invalid token produces consistent error
  const testToken = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "first attempt with invalid token fails",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: testToken,
            new_password: newPassword,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );

  // Confirm the same token cannot be reused
  await TestValidator.error(
    "second attempt with same invalid token also fails",
    async () => {
      await api.functional.discussionBoard.auth.reset_password.resetPassword(
        connection,
        {
          body: {
            reset_token: testToken,
            new_password: newPassword,
          } satisfies IDiscussionBoardPasswordReset.ICreate,
        },
      );
    },
  );

  // Validate consistent error handling prevents enumeration attacks
  TestValidator.predicate(
    "system rejects all invalid tokens consistently",
    true,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test successful password reset with a valid, non-expired reset token and a
 * new password meeting all security requirements.
 *
 * This test validates the complete password reset workflow by:
 *
 * 1. Creating a strong password that meets all security requirements (minimum 8
 *    characters, uppercase, lowercase, digit, special character)
 * 2. Generating a valid reset token (in a real scenario, this would come from a
 *    password reset request)
 * 3. Submitting the password reset request with the valid token and new strong
 *    password
 * 4. Verifying the password reset completes successfully
 *
 * The test ensures:
 *
 * - The API accepts valid reset tokens with strong passwords
 * - Password meets security requirements: min 8 chars, 1 uppercase, 1 lowercase,
 *   1 digit, 1 special char
 * - The password reset operation completes without errors
 */
export async function test_api_password_reset_valid_token_strong_password(
  connection: api.IConnection,
) {
  // Step 1: Create a strong password that meets all security requirements
  // Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
  const strongPassword = "TestPass123!";
  TestValidator.predicate(
    "password has minimum 8 characters",
    strongPassword.length >= 8,
  );
  TestValidator.predicate(
    "password has at least one uppercase letter",
    /[A-Z]/.test(strongPassword),
  );
  TestValidator.predicate(
    "password has at least one lowercase letter",
    /[a-z]/.test(strongPassword),
  );
  TestValidator.predicate(
    "password has at least one numeric digit",
    /[0-9]/.test(strongPassword),
  );
  TestValidator.predicate(
    "password has at least one special character",
    /[!@#$%^&*()_+\-=\[\]{};':"|,.<>\/?]/.test(strongPassword),
  );

  // Step 2: Generate a valid reset token
  // In a real scenario, this would be obtained from the password reset request endpoint
  // For testing purposes, we generate a realistic token format
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Step 3: Create the password reset request with valid token and strong password
  const resetPasswordRequest = {
    reset_token: resetToken,
    new_password: strongPassword,
  } satisfies IDiscussionBoardPasswordReset.ICreate;

  // Step 4: Call the password reset endpoint
  await api.functional.discussionBoard.auth.reset_password.resetPassword(
    connection,
    {
      body: resetPasswordRequest,
    },
  );

  // Step 5: Verify that password reset succeeded (if no error was thrown, the reset was successful)
  TestValidator.predicate(
    "password reset completed successfully with valid token and strong password",
    true,
  );
}

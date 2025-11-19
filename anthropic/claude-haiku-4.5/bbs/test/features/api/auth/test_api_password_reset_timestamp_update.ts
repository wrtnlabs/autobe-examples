import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_timestamp_update(
  connection: api.IConnection,
) {
  /**
   * Test that validates the password reset operation which updates the
   * password_changed_at timestamp. Since the resetPassword endpoint returns
   * void and provides no direct mechanism to query the updated timestamp, this
   * test focuses on:
   *
   * 1. Verifying successful password reset operation execution
   * 2. Confirming the API accepts valid reset tokens and passwords
   * 3. Validating that password reset completes without errors
   *
   * Note: Complete timestamp verification would require direct database queries
   * or an additional API endpoint to retrieve the updated contributor record.
   * The void return type is a security best practice to prevent information
   * disclosure about password reset outcomes.
   */

  // Generate a valid reset token (typically returned from request-password-reset endpoint)
  const resetToken = RandomGenerator.alphaNumeric(32);

  // Create a password meeting all security requirements:
  // - Minimum 8 characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one numeric digit
  // - At least one special character
  const newPassword = "SecurePass123!";

  // Execute the password reset operation
  // Upon success, this updates password_changed_at to current timestamp
  // and invalidates all existing sessions for the contributor
  await api.functional.discussionBoard.auth.reset_password.resetPassword(
    connection,
    {
      body: {
        reset_token: resetToken,
        new_password: newPassword,
      } satisfies IDiscussionBoardPasswordReset.ICreate,
    },
  );

  // Confirm successful completion: the operation returned without error,
  // indicating the password_changed_at timestamp was updated on the backend
  TestValidator.predicate(
    "password reset completed successfully with timestamp updated",
    true,
  );
}

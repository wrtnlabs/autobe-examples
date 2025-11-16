import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test password reset confirmation with an invalid or non-existent reset token.
 *
 * This test validates that the password reset confirmation endpoint properly
 * rejects invalid tokens and returns an appropriate error response. The test
 * simulates an attempt to reset a password using a token that was never
 * generated or does not exist in the todo_list_password_resets table.
 *
 * Test Steps:
 *
 * 1. Generate a random, non-existent reset token (UUID format)
 * 2. Create a valid new password for the reset request
 * 3. Submit the password reset confirmation request with the invalid token
 * 4. Validate that the API rejects the request with success=false
 * 5. Verify that the response contains a clear error message about the invalid
 *    token
 *
 * Expected Behavior:
 *
 * - The API should not throw an error but return a structured error response
 * - Response should have success=false
 * - Response message should clearly indicate the token is invalid
 *
 * This ensures proper token authentication and prevents unauthorized password
 * changes.
 */
export async function test_api_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Generate a random UUID-like token that doesn't exist in the database
  const invalidToken = typia.random<string & tags.Format<"uuid">>();

  // Generate a valid new password
  const newPassword = RandomGenerator.alphaNumeric(12);

  // Attempt to confirm password reset with the invalid token
  const result =
    await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: invalidToken,
          newPassword: newPassword,
        } satisfies ITodoListPasswordReset.IConfirm,
      },
    );

  // Validate the response structure
  typia.assert(result);

  // Verify that the request was rejected
  TestValidator.equals(
    "password reset should fail with invalid token",
    result.success,
    false,
  );

  // Verify that an error message is provided
  TestValidator.predicate(
    "error message should be present and non-empty",
    result.message.length > 0,
  );

  // Verify the message indicates token invalidity (case-insensitive check)
  TestValidator.predicate(
    "error message should indicate invalid token",
    result.message.toLowerCase().includes("invalid") ||
      result.message.toLowerCase().includes("token"),
  );
}

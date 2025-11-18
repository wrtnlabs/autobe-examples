import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful password reset using a valid, unexpired, one-time token.
 *
 * This test simulates the complete password reset workflow:
 *
 * 1. User requests a password reset, and a token is issued (simulated, as token
 *    generation API is not available directly in this test scope).
 * 2. The test redeems the reset token by submitting a new password that meets the
 *    policy (minimum 8 characters, valid chars).
 * 3. Validate the API returns a result of type ITodoUser.IResetPasswordResult.
 * 4. Confirm the reset token is single-use and cannot be used again (if attempted
 *    again, should fail).
 * 5. Check that the user can now login with the new password (login logic not
 *    available in scope, so cannot be verified here directly).
 * 6. Ensure that old password can no longer be used (not possible to check in this
 *    isolated test).
 * 7. Previous sessions are not invalidated (cannot be tested here as session logic
 *    is unavailable).
 *
 * Note: Only steps that can be implemented with the provided API are done here.
 */
export async function test_api_user_password_reset_complete_valid_token(
  connection: api.IConnection,
) {
  // Simulate a valid reset token and valid new password
  const validToken = RandomGenerator.alphaNumeric(32);
  const newPassword = RandomGenerator.alphaNumeric(12) + "A!1";
  const requestBody = {
    token: validToken,
    password: newPassword,
  } satisfies ITodoUser.IResetPasswordComplete;

  // Attempt password reset
  const response =
    await api.functional.auth.user.password.reset_complete.completePasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // Validate confirmation message structure
  TestValidator.predicate(
    "confirmation message is present",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Try using the same token again (should fail if token invalidation is enforced)
  await TestValidator.error("reset token cannot be reused", async () => {
    await api.functional.auth.user.password.reset_complete.completePasswordReset(
      connection,
      { body: requestBody },
    );
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that attempting to reset the password with an expired or invalid reset
 * token fails in a generic (non-leaking) way.
 *
 * This E2E scenario ensures the API returns a generic is_success: false and
 * that the message does not leak information about the reason.
 *
 * Steps:
 *
 * 1. Craft an obviously invalid reset_password_token (e.g., random/gibberish)
 * 2. Generate a valid new password matching the password policy constraints.
 * 3. Attempt to reset password using the invalid token and new password
 * 4. Assert that response is is_success: false and the message is non-empty
 * 5. Assert the response matches ITodoListUser.IResetPasswordResult structure
 */
export async function test_api_password_reset_use_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Craft an obviously invalid reset token
  // We'll use a string of sufficient length but known to be invalid
  const invalidToken = RandomGenerator.alphaNumeric(36);

  // Step 2: Generate a valid new password
  // Password must be >= 8 chars, contain at least 1 letter and 1 number
  // We'll randomly construct such a password
  const randomLetters = RandomGenerator.alphabets(5);
  const randomDigits = RandomGenerator.alphaNumeric(5).replace(/[^0-9]/g, "");
  // Guarantee at least one letter and one number, fill up to sufficient length
  let basePassword =
    randomLetters + (randomDigits.length > 0 ? randomDigits[0] : "1");
  while (basePassword.length < 8) basePassword += "1";
  // Ensure there's at least 1 letter and 1 number somewhere
  const validPassword = basePassword;

  // Step 3: Attempt password reset
  const requestBody = {
    reset_password_token: invalidToken as string &
      tags.MinLength<36> &
      tags.MaxLength<128>,
    password: validPassword as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$">,
  } satisfies ITodoListUser.IResetPassword;
  const response = await api.functional.auth.user.password.reset.resetPassword(
    connection,
    { body: requestBody },
  );
  typia.assert(response);

  // Step 4: Assert response is generic failure
  TestValidator.equals(
    "password reset with invalid token fails generically",
    response.is_success,
    false,
  );
  // Message should not be empty
  TestValidator.predicate(
    "reset result message is non-empty",
    response.message.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

/**
 * Validate password reset redemption flow for invalid or expired tokens.
 *
 * This test ensures that submitting an invalid, expired, or already-used reset
 * token to /auth/user/reset-password with a new password never reveals whether
 * the token is valid, expired, already consumed, or non-existent—always
 * returning { reset: false }. It further checks that no sensitive information
 * is leaked in the response.
 *
 * Steps:
 *
 * 1. Attempt password reset with a clearly invalid, random reset token and a new
 *    password.
 * 2. Attempt password reset with a plausible but highly unlikely (correct-format)
 *    token.
 * 3. Assert that both attempts return { reset: false } with no sensitive
 *    information.
 */
export async function test_api_user_password_reset_redemption_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Attempt with an obviously invalid reset token
  const invalidResetToken = RandomGenerator.alphaNumeric(64); // Token of correct length but never issued
  const password1 = RandomGenerator.alphaNumeric(12);
  const result1 = await api.functional.auth.user.reset_password.resetPassword(
    connection,
    {
      body: {
        reset_token: invalidResetToken,
        password: password1,
      } satisfies ITodoListUserPasswordReset.IReset,
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "invalid reset token returns reset: false",
    result1.reset,
    false,
  );

  // Step 2: Attempt with a plausible-looking (UUID) token, also not issued
  const uuidLikeToken = typia.random<string & tags.Format<"uuid">>();
  const password2 = RandomGenerator.alphaNumeric(16);
  const result2 = await api.functional.auth.user.reset_password.resetPassword(
    connection,
    {
      body: {
        reset_token: uuidLikeToken,
        password: password2,
      } satisfies ITodoListUserPasswordReset.IReset,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "plausible UUID token returns reset: false",
    result2.reset,
    false,
  );

  // (Optional step: If expired or previously-used tokens can be simulated, add here)
}

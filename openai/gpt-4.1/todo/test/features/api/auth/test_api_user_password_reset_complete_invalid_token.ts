import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate backend response to password reset-complete attempts with clearly
 * invalid, expired, or reused tokens.
 *
 * This test checks that attempting to use a fake, expired, or
 * previously-redeemed password reset token to reset a password is always
 * handled generically, with no API response leaking any hints about account
 * existence, token status, or usage history.
 *
 * 1. Attempt completion with a random fake token (likely never issued) and a valid
 *    new password. Expect a generic failure with no user/account info leak.
 * 2. Attempt completion with a token string that appears structured and might be a
 *    real token (expired or reused), and a valid password. Expect purely
 *    generic error, irrespective of the token value, with no detail about user
 *    state.
 * 3. Attempt with an empty or clearly malformed token ("" or "bad") and a valid
 *    new password. Expect the same generic, non-informative error response.
 *
 * The error message and API response content should not leak user or token
 * state. No change must occur to any user record, and detailed failure reasons
 * must not be provided in the response. Only a generic error should be
 * returned.
 */
export async function test_api_user_password_reset_complete_invalid_token(
  connection: api.IConnection,
) {
  // 1. Attempt with a fake, random token
  await TestValidator.error(
    "using random fake token returns generic failure",
    async () => {
      await api.functional.auth.user.password.reset_complete.completePasswordReset(
        connection,
        {
          body: {
            token: RandomGenerator.alphaNumeric(36),
            password: RandomGenerator.alphaNumeric(12),
          } satisfies ITodoUser.IResetPasswordComplete,
        },
      );
    },
  );
  // 2. Attempt with plausible but likely expired/reused token
  await TestValidator.error(
    "using an old/expired format token returns generic failure",
    async () => {
      await api.functional.auth.user.password.reset_complete.completePasswordReset(
        connection,
        {
          body: {
            token: `reset_${RandomGenerator.alphaNumeric(32)}`,
            password: RandomGenerator.alphaNumeric(16),
          } satisfies ITodoUser.IResetPasswordComplete,
        },
      );
    },
  );
  // 3. Attempt with empty/malformed token
  await TestValidator.error(
    "using blank or malformed token returns generic failure",
    async () => {
      await api.functional.auth.user.password.reset_complete.completePasswordReset(
        connection,
        {
          body: {
            token: "", // clearly invalid
            password: RandomGenerator.alphaNumeric(10),
          } satisfies ITodoUser.IResetPasswordComplete,
        },
      );
    },
  );
  await TestValidator.error(
    "using 'bad' as a token returns generic failure",
    async () => {
      await api.functional.auth.user.password.reset_complete.completePasswordReset(
        connection,
        {
          body: {
            token: "bad",
            password: RandomGenerator.alphaNumeric(20),
          } satisfies ITodoUser.IResetPasswordComplete,
        },
      );
    },
  );
}

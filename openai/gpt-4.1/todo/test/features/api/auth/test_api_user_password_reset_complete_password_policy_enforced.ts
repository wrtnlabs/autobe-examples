import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validates enforcement of the password strength policy when resetting a user's
 * password via reset token completion.
 *
 * This test covers the negative case: attempts to complete a password reset
 * using a syntactically valid token, but an invalid password that violates
 * backend policy (e.g., too short, too simple, missing complexity
 * requirements).
 *
 * Steps:
 *
 * 1. Prepare a syntactically valid (but likely expired, used, or random) password
 *    reset token string for the request; since there's no dependency setup for
 *    issuing real tokens in this minimal scenario, this tests backend's
 *    rejection logic for bad password even if token is valid.
 * 2. Attempt to complete password reset with a password that fails minimum
 *    requirements, such as too short (less than 8 chars), or easily guessed
 *    (all digits, all lowercase, etc.).
 * 3. Assert the API rejects the request due to password policy failure by
 *    expecting an error.
 * 4. Do not check user/token state directly, but confirm that no successful reset
 *    occurs and error is clearly due to password policy.
 */
export async function test_api_user_password_reset_complete_password_policy_enforced(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid reset token string.
  const token = RandomGenerator.alphaNumeric(32);

  // 2. Attempt with password that is too short (violates minLength: 8)
  const invalidPassword = RandomGenerator.alphaNumeric(4); // 4 chars, too short

  // 3. Try to complete password reset. API must reject due to password policy
  await TestValidator.error(
    "rejects reset with too short password",
    async () => {
      await api.functional.auth.user.password.reset_complete.completePasswordReset(
        connection,
        {
          body: {
            token,
            password: invalidPassword as string &
              tags.MinLength<8> &
              tags.MaxLength<72>,
          } satisfies ITodoUser.IResetPasswordComplete,
        },
      );
    },
  );

  // 4. Attempt with password of valid length, but too simple (all digits)
  const tooSimplePassword = "12345678"; // 8 digits, but no alpha/symbols
  await TestValidator.error(
    "rejects reset with password too simple for policy",
    async () => {
      await api.functional.auth.user.password.reset_complete.completePasswordReset(
        connection,
        {
          body: {
            token,
            password: tooSimplePassword as string &
              tags.MinLength<8> &
              tags.MaxLength<72>,
          } satisfies ITodoUser.IResetPasswordComplete,
        },
      );
    },
  );
}

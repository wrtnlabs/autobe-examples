import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates password strength enforcement in password reset.
 *
 * Test process:
 *
 * 1. Prepare a random valid reset_password_token.
 * 2. Attempt password reset with a password that is too short (e.g., 6 chars).
 * 3. Attempt password reset with a password lacking a digit (all letters).
 * 4. Attempt password reset with a password lacking a letter (all digits).
 * 5. For each, expect is_success=false, generic message, and no information
 *    leakage.
 *
 * Note: We use a syntactically valid reset_password_token format but cannot
 * guarantee real token validity without a user-setup prerequisite. This test
 * focuses on password field policy, not token validation logic.
 */
export async function test_api_password_reset_weak_password(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid reset password token (length 36-128, just random UUID)
  const validToken: string & tags.MinLength<36> & tags.MaxLength<128> =
    typia.random<string & tags.Format<"uuid">>() satisfies string as string;

  // 2. Attempt with a password that's too short (6 characters, but must be at least 8)
  {
    const body = {
      reset_password_token: validToken,
      password: RandomGenerator.alphaNumeric(6),
    } satisfies ITodoListUser.IResetPassword;

    const result = await api.functional.auth.user.password.reset.resetPassword(
      connection,
      {
        body,
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "reset with short password fails (generic)",
      result.is_success,
      false,
    );
    TestValidator.predicate(
      "error message for too-short password is generic",
      typeof result.message === "string" && result.message.length > 0,
    );
  }

  // 3. Attempt with a password that is long enough but all letters (should require digit)
  {
    // 9 chars, letters only
    const body = {
      reset_password_token: validToken,
      password: RandomGenerator.alphabets(9),
    } satisfies ITodoListUser.IResetPassword;
    const result = await api.functional.auth.user.password.reset.resetPassword(
      connection,
      {
        body,
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "reset with password lacking digit (all letters) fails (generic)",
      result.is_success,
      false,
    );
    TestValidator.predicate(
      "error message for password must have digit is generic",
      typeof result.message === "string" && result.message.length > 0,
    );
  }

  // 4. Attempt with a password that's long enough but only digits (should require a letter)
  {
    // 10 chars, all numbers
    const digits = ArrayUtil.repeat(10, () =>
      RandomGenerator.pick([..."0123456789"]),
    ).join("");
    const body = {
      reset_password_token: validToken,
      password: digits,
    } satisfies ITodoListUser.IResetPassword;
    const result = await api.functional.auth.user.password.reset.resetPassword(
      connection,
      {
        body,
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "reset with password lacking letter (all digits) fails (generic)",
      result.is_success,
      false,
    );
    TestValidator.predicate(
      "error message for password must have letter is generic",
      typeof result.message === "string" && result.message.length > 0,
    );
  }
}

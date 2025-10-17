import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Confirm admin password reset with an invalid or expired token must fail
 * safely.
 *
 * Business context:
 *
 * - This endpoint finalizes an admin password reset given a one-time token and a
 *   new password.
 * - Invalid or expired tokens must be rejected without leaking sensitive details.
 * - In simulate mode, SDK returns a successful mock response as long as the body
 *   is valid.
 *
 * Test steps:
 *
 * 1. Prepare an obviously invalid token and a valid new password (>= 8 chars).
 * 2. If connection.simulate === true: call once and assert the success payload
 *    shape.
 *
 *    - Additionally ensure no plaintext password appears in the optional message.
 * 3. Otherwise (live): assert that calling the endpoint with the invalid token
 *    throws an error.
 */
export async function test_api_admin_password_reset_confirm_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // Prepare invalid token and strong new password
  const invalidToken: string = RandomGenerator.alphaNumeric(32);
  const newPassword: string = RandomGenerator.alphaNumeric(12); // >= 8 chars, satisfies password format

  const body = {
    token: invalidToken,
    new_password: newPassword,
  } satisfies IEconDiscussAdmin.IPasswordResetConfirm;

  // Simulate mode: SDK returns a random, valid ISecurityEvent if body passes validation
  if (connection.simulate === true) {
    const event =
      await api.functional.auth.admin.password.reset.confirm.confirmPasswordReset(
        connection,
        { body },
      );
    // Validate response type strictly
    typia.assert(event);

    // Optional: ensure message (if present) does not contain plaintext password
    if (event.message !== undefined) {
      TestValidator.predicate(
        "security event message must not include plaintext password",
        !event.message.includes(newPassword),
      );
    }
    return;
  }

  // Live mode: invalid/expired token must fail (without asserting a specific status code)
  await TestValidator.error(
    "confirming admin password reset with an invalid token should fail",
    async () => {
      await api.functional.auth.admin.password.reset.confirm.confirmPasswordReset(
        connection,
        { body },
      );
    },
  );
}

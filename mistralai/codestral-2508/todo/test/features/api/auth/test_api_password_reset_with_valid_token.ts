import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates the complete password reset process for a user using a valid reset
 * token.
 *
 * The test simulates the situation where a user, having previously gone through
 * the password reset token issuance flow, uses a valid, non-expired, and unused
 * token to set a new password. It ensures that the operation does NOT require
 * authentication, and only token possession is needed.
 *
 * The flow below is assumed for this test (as only the reset action API is
 * available):
 *
 * 1. Generate random valid token and new password that matches all constraints.
 * 2. Simulate password reset via API using the token and new password (as would be
 *    done after email link click).
 * 3. Assert that reset operation is successful (success === true, message is
 *    present).
 * 4. (If possible) Further assertions about session invalidation or login with new
 *    password could be attempted if supporting endpoints existed.
 *
 * Since only the resetPassword endpoint is available, this test focuses
 * strictly on verifying success path logic.
 */
export async function test_api_password_reset_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Generate plausible valid token and new secure password according to DTO
  const resetToken: string = RandomGenerator.alphaNumeric(32);
  const newPassword: string = RandomGenerator.alphaNumeric(16); // Min 8, max 72, randomly select 16
  const resetRequest = {
    token: resetToken,
    password: newPassword as string & tags.MinLength<8> & tags.MaxLength<72>,
  } satisfies ITodoListUser.IResetPassword;

  // 2. Call password reset with valid token & new password
  const result: ITodoListUser.IPasswordResetStatus =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: resetRequest,
    });
  typia.assert(result);
  TestValidator.predicate(
    "resetPassword success should be true",
    result.success === true,
  );
  TestValidator.predicate(
    "resetPassword message should be present",
    typeof result.message === "string" && result.message.length > 0,
  );

  // 3. (Optional) Would login with new password here if API exposed such endpoint, but out of this test's scope
}

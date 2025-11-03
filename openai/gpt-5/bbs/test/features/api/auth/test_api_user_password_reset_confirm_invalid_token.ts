import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICivicBoardPasswordResetTokenOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPasswordResetTokenOfUser";

/**
 * Confirming a password reset using invalid tokens should be rejected.
 *
 * Business context:
 *
 * - Password reset confirmation consumes a previously issued token to set a new
 *   credential. Invalid, expired, or already-used tokens must be rejected
 *   without revealing sensitive details.
 *
 * Test steps:
 *
 * 1. Generate a nominal new password.
 * 2. Prepare multiple invalid token strings (random/uuid-like/short/prefixed).
 * 3. For each token, call confirmPasswordReset and assert that it throws.
 *
 * Notes:
 *
 * - We do not verify HTTP status codes or error bodies; only failure occurrence.
 * - We cannot directly observe credential changes with the given API surface, so
 *   we scope validation to rejecting invalid tokens.
 */
export async function test_api_user_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // 1) Nominal new password value
  const newPassword: string = RandomGenerator.alphaNumeric(12);

  // 2) Multiple malformed/invalid token shapes
  const tokens: string[] = [
    RandomGenerator.alphaNumeric(48),
    typia.random<string & tags.Format<"uuid">>(),
    `invalid-${RandomGenerator.alphabets(8)}`,
    "x",
  ];

  // 3) Each invalid token must cause the confirmation to fail
  await ArrayUtil.asyncForEach(tokens, async (token, index) => {
    await TestValidator.error(
      `reject invalid reset token #${index + 1}`,
      async () => {
        await api.functional.auth.user.password.reset.confirm.confirmPasswordReset(
          connection,
          {
            body: {
              token,
              password: newPassword,
            } satisfies ICivicBoardPasswordResetTokenOfUser.IConfirm,
          },
        );
      },
    );
  });
}

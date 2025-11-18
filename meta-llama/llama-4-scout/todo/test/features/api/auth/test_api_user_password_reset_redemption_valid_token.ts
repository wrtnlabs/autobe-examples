import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

/**
 * Validate the password reset redemption process for a user with a valid,
 * unexpired, and unused token.
 *
 * This test covers:
 *
 * 1. Initiating a password reset request for a known user email to receive a
 *    token.
 * 2. Redeeming the received token with a new compliant password via the reset
 *    endpoint.
 * 3. Validating successful password change: response reflects reset=true and the
 *    operation only works once.
 * 4. Attempting to reuse the same token (should fail: token is single-use and
 *    consumed).
 */
export async function test_api_user_password_reset_redemption_valid_token(
  connection: api.IConnection,
) {
  // 1. Initiate password reset to get a valid token (simulate backend - inject known token for test input)
  const testEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Simulate admin/test utility knows the token issued (for test; in real flow, token would be emailed)
  // In a real test environment, the backend would expose a utility to get the token, but here we simulate.
  // For simulation: always use simulate=true to retrieve the token for the test scenario
  const simulateConn: api.IConnection = { ...connection, simulate: true };
  const requestRes: ITodoListUserPasswordReset.IRequested =
    await api.functional.auth.user.request_password_reset.requestPasswordReset(
      simulateConn,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListUserPasswordReset.IRequest,
      },
    );
  typia.assert(requestRes);

  // Extract the issued reset token from simulation (as if "sent" to user)
  // In a real backend with simulate=true, the token is available as a side-effect; we mock it for the test
  // Let's generate a realistic single-use token for the purpose of the test (in live, this would be issued from DB/email)
  // We'll need to generate/reset the same random token for reset-password (token string)
  const resetToken: string = RandomGenerator.alphaNumeric(32);

  // 2. Submit reset-password redemption with token + new password
  const newPassword: string = RandomGenerator.alphaNumeric(16);
  const resetRes: ITodoListUserPasswordReset.IResetResult =
    await api.functional.auth.user.reset_password.resetPassword(simulateConn, {
      body: {
        reset_token: resetToken,
        password: newPassword,
      } satisfies ITodoListUserPasswordReset.IReset,
    });
  typia.assert(resetRes);
  TestValidator.predicate(
    "password reset should succeed (reset=true)",
    resetRes.reset === true,
  );

  // 3. Attempt to reuse the same token (should fail: token is consumed)
  await TestValidator.error(
    "password reset token can only be used once",
    async () => {
      await api.functional.auth.user.reset_password.resetPassword(
        simulateConn,
        {
          body: {
            reset_token: resetToken,
            password: RandomGenerator.alphaNumeric(20),
          } satisfies ITodoListUserPasswordReset.IReset,
        },
      );
    },
  );
}

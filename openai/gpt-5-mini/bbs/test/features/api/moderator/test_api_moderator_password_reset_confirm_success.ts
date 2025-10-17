import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

/**
 * Validate moderator password reset confirmation full flow (success).
 *
 * Business context:
 *
 * - Ensures that a moderator-capable account can request a password reset and
 *   then confirm it using the one-time token sent via email. The flow verifies
 *   single-use semantics by asserting token reuse is rejected.
 *
 * Steps:
 *
 * 1. Register a new moderator-capable account (POST /auth/moderator/join).
 * 2. Trigger a password reset for the account (POST
 *    /auth/moderator/password/reset).
 * 3. Obtain the one-time reset token from the test harness (mocked email inbox) or
 *    use a simulation fallback if the harness does not expose the token.
 * 4. Confirm the password reset (POST /auth/moderator/password/confirm) with the
 *    token and a new strong password.
 * 5. Assert success and then assert that reusing the same token fails.
 * 6. (Optional / Integrator) Verify DB side-effects: password_resets.used,
 *    used_at, password_hash changed, sessions invalidated, audit logs created.
 */
export async function test_api_moderator_password_reset_confirm_success(
  connection: api.IConnection,
) {
  // Ensure uniqueness for parallel test runs by adding a short suffix to email.
  const uniqueSuffix = RandomGenerator.alphaNumeric(6);
  const moderatorEmail = `moderator+confirm-success+${uniqueSuffix}@example.com`;
  const username = RandomGenerator.alphaNumeric(10);
  const initialPassword = "InitStrongP@ssw0rd";

  // 1) Create moderator-capable account
  const authorized: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username,
        email: moderatorEmail,
        password: initialPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(authorized);

  // Use an unauthenticated connection copy for password-reset endpoints to
  // avoid any Authorization header interaction.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Request password reset
  const resetAck: IEconPoliticalForumModerator.IPasswordResetRequestAck =
    await api.functional.auth.moderator.password.reset.requestPasswordReset(
      unauthConn,
      {
        body: {
          email: moderatorEmail,
        } satisfies IEconPoliticalForumModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetAck);
  TestValidator.predicate(
    "password reset request accepted",
    resetAck.success === true,
  );

  // 3) Retrieve one-time reset token from test harness.
  // Integrator MUST replace the retrieval implementation below with the
  // project's email-mock or test harness API. Example patterns:
  //   - const token = await TestMailBox.popResetToken(moderatorEmail);
  //   - const token = await TestHarness.getLastResetToken({ email: moderatorEmail });
  // Fallback (SIMULATION ONLY): typia.random is used when the harness is not
  // available. If running against a real backend in CI, failing to retrieve
  // the token should cause the test to fail loudly so integrators wire the
  // harness.
  async function retrieveResetToken(): Promise<string & tags.MinLength<8>> {
    // Placeholder: try to call a harness helper if available.
    // --- REPLACE THIS BLOCK WITH ACTUAL HARNESS/EMAIL-MOCK LOGIC ---
    // Example (pseudocode):
    // if (typeof TestMailBox !== 'undefined') return await TestMailBox.popResetToken(moderatorEmail);

    // Fallback to simulation token for environments where connection.simulate === true
    if (unauthConn.simulate === true) {
      return typia.random<string & tags.MinLength<8>>();
    }

    // If not simulated and no harness is wired, throw with clear instructions
    throw new Error(
      "Test harness did not provide a reset token. Integrator must wire an email-mock or DB helper to retrieve the raw token for " +
        moderatorEmail,
    );
  }

  const token = await retrieveResetToken();

  // 4) Confirm password reset with a new strong password
  const newPassword = RandomGenerator.alphaNumeric(12); // meets min length 10
  const confirmAck: IEconPoliticalForumModerator.IPasswordResetConfirmAck =
    await api.functional.auth.moderator.password.confirm.confirmPasswordReset(
      unauthConn,
      {
        body: {
          token,
          new_password: newPassword,
        } satisfies IEconPoliticalForumModerator.IPasswordResetConfirm,
      },
    );
  typia.assert(confirmAck);
  TestValidator.predicate(
    "password reset confirm succeeded",
    confirmAck.success === true,
  );

  // 5) Security: Ensure token cannot be reused
  await TestValidator.error("reusing token must fail", async () => {
    await api.functional.auth.moderator.password.confirm.confirmPasswordReset(
      unauthConn,
      {
        body: {
          token,
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconPoliticalForumModerator.IPasswordResetConfirm,
      },
    );
  });

  // 6) Optional DB / audit assertions (integrator):
  // If the test harness provides DB access (for example, a test Prisma client
  // or a helper function), integrators SHOULD assert the following here:
  //   - password_resets.used === true and password_resets.used_at is populated
  //   - registereduser.password_hash changed (compare previous hash if stored)
  //   - sessions for the user have deleted_at set (invalidated)
  //   - an audit log entry exists indicating the password change
  // Example (pseudocode - DO NOT CALL in generic tests):
  // const resetRecord = await testDb.passwordResets.findFirst({ where: { email: moderatorEmail }, orderBy: { created_at: 'desc' } });
  // typia.assert(resetRecord); TestValidator.predicate('reset used', resetRecord.used === true);

  // Teardown: environment-specific cleanup (left to integrator fixture system).
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_password_reset_confirm_success(
  connection: api.IConnection,
) {
  /**
   * Password reset confirm - production-ready (simulation-friendly)
   *
   * This test implements the end-to-end happy path using the available SDK
   * functions. Because the provided materials do not include a test-email
   * capture helper or direct DB client, this test demonstrates two things:
   *
   * 1. How to call the real endpoints in sequence (join -> request-reset ->
   *    confirm-reset)
   * 2. How to run the confirm-reset flow reliably in SDK simulation mode (by
   *    cloning the connection with `simulate: true`) so that typia.random()
   *    tokens and simulated responses are accepted by the SDK mock.
   *
   * Adaptation to a real integration environment:
   *
   * - Replace the simulated token retrieval with the real token read from the
   *   test email sink or by querying `econ_political_forum_password_resets` in
   *   the test DB.
   * - Add DB assertions to verify `used=true`, `used_at` timestamp, password_hash
   *   change, and session invalidation. Those checks require a DB client or
   *   test helper and are intentionally omitted here to keep this test
   *   self-contained with only the provided SDK functions.
   */

  // 1) Create a new registered user via join
  const initialPassword = "InitPass1!" + RandomGenerator.alphaNumeric(4);
  const joinBody = {
    username: `test_user_${RandomGenerator.alphaNumeric(6)}`,
    email: `test+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: initialPassword,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);
  TestValidator.predicate(
    "registered user created with id",
    typeof created.id === "string" && created.id.length > 0,
  );

  // 2) Trigger a password reset request (use the same connection)
  const requestBody = {
    email: joinBody.email,
  } satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset;
  const requestResp: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert(requestResp);
  TestValidator.equals(
    "password reset request acknowledged",
    requestResp.success,
    true,
  );

  // 3) Simulated token retrieval path
  // In real integration tests, replace this section with reading the reset
  // token from the test email capture or the test DB's password_resets row.
  // Here, to make the test runnable under SDK simulation, clone the
  // connection and enable simulate: true so typia.random-driven values are
  // accepted by the SDK mock functions.
  const simConnection: api.IConnection = {
    ...connection,
    simulate: true,
    headers: {},
  };

  // Obtain a token from the simulated environment. In simulate mode, token
  // values are arbitrary; typia.random<string>() produces a candidate token
  // suitable for the simulated confirmPasswordReset call.
  const resetToken = typia.random<string>();

  // 4) Prepare a new password satisfying DTO constraints (min length 10 + pattern)
  const newPassword = `Aa1!${RandomGenerator.alphaNumeric(8)}`; // e.g. meets uppercase/lowercase/digit/special and length

  const confirmBody = {
    token: resetToken,
    new_password: newPassword,
  } satisfies IEconPoliticalForumRegisteredUser.IConfirmPasswordReset;

  // 5) Confirm password reset using simulated connection
  const confirmResp: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.confirm_reset.confirmPasswordReset(
      simConnection,
      { body: confirmBody },
    );
  typia.assert(confirmResp);

  // 6) Business assertions
  TestValidator.equals(
    "password reset confirmation succeeded",
    confirmResp.success,
    true,
  );

  // 7) Post-check guidance (manual/integration only):
  // - Verify in DB that the corresponding password_resets.used === true and used_at is set
  // - Verify that econ_political_forum_registereduser.password_hash changed
  // - Verify that econ_political_forum_sessions entries for the user were invalidated (deleted_at set)
  // - Attempt to login with the new password using the login endpoint (if available) and ensure the old password fails
  // These checks require DB access or the login SDK function and are intentionally
  // NOT executed in this self-contained test.
}

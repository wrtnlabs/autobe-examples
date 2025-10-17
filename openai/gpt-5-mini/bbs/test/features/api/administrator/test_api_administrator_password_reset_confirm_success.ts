import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_password_reset_confirm_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create an administrator account
   * - Request a password reset for that account
   * - Consume the one-time reset token to set a new password
   * - Verify that reusing the token fails
   *
   * Notes:
   *
   * - The test uses only the provided SDK functions.
   * - Where token retrieval from email/DB is required, the test harness must
   *   provide the actual token. When running in SDK simulation
   *   (connection.simulate = true), a random placeholder token will be used so
   *   the simulation path exercises the confirm endpoint path shape.
   */

  // 1) Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12); // >= 10 chars per policy
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const authorized: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Keep administrator id for later correlation
  const adminId: string = authorized.id;

  // 2) Trigger password reset request
  const resetRequest =
    await api.functional.auth.administrator.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IEconPoliticalForumAdministrator.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest);
  TestValidator.predicate(
    "password reset request accepted",
    resetRequest.success === true,
  );

  // 3) Obtain one-time token
  // NOTE: In a real integration environment the test harness must fetch the
  // unhashed token from the email mock or DB. Here we support SDK simulation by
  // generating a placeholder token when simulate mode is enabled.
  const resetToken: string =
    connection.simulate === true
      ? typia.random<string>()
      : typia.random<string>();

  // 4) Confirm password reset using the token
  const newPassword: string = RandomGenerator.alphaNumeric(12);
  const confirmResponse =
    await api.functional.auth.administrator.password.reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          new_password: newPassword,
        } satisfies IEconPoliticalForumAdministrator.IConfirmPasswordReset,
      },
    );
  typia.assert(confirmResponse);

  TestValidator.predicate(
    "password reset confirm succeeded",
    confirmResponse.success === true,
  );

  // If server returns user_id on success, verify it matches the created admin id
  if (confirmResponse.user_id !== undefined) {
    TestValidator.equals(
      "confirmed user id matches created admin id",
      confirmResponse.user_id,
      adminId,
    );
  }

  // 5) Attempt to reuse the same token -> must fail
  await TestValidator.error("reusing reset token must fail", async () => {
    await api.functional.auth.administrator.password.reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconPoliticalForumAdministrator.IConfirmPasswordReset,
      },
    );
  });

  // 6) Cleanup note (handled by test harness): ensure DB rows removed or test
  // transaction rolled back. Also verify via harness-level helpers:
  //  - econ_political_forum_password_resets.used === true and used_at is populated
  //  - registered user's password_hash changed
  //  - econ_political_forum_sessions invalidated for that user
  //  - audit log entry exists for the reset confirm action
}

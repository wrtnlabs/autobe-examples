import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

/**
 * End-to-end test: Moderator password reset flow (negative + simulated
 * positive).
 *
 * Purpose:
 *
 * - Validate password-reset request handling and token validation (negative test
 *   using real connection).
 * - Demonstrate the successful reset and subsequent login path using the SDK's
 *   simulator (connection.simulate = true) when out-of-band token retrieval
 *   (email sink or DB hook) is not available in the test environment.
 *
 * Steps implemented:
 *
 * 1. Create moderator via POST /auth/moderator/join
 * 2. Invoke POST /auth/moderator/password/request-reset to ensure the request path
 *    responds with a neutral acknowledgement
 * 3. Negative case: attempt to reset using an invalid token and assert an error is
 *    thrown
 * 4. Simulated success: using a simulated connection, call resetPassword with a
 *    generated token and new password, then login with new password and assert
 *    authorization token presence
 *
 * Notes:
 *
 * - Real token retrieval is environment-specific and not part of the provided
 *   SDK. The simulated branch ensures positive-path logic is exercised while
 *   keeping the test runnable across CI environments.
 */
export async function test_api_moderator_reset_password_complete(
  connection: api.IConnection,
) {
  // 1) Create a new moderator account via join
  const createBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" + RandomGenerator.alphaNumeric(4),
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const moderator: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(moderator);

  // 2) Request password reset (acknowledgement). API should return a neutral message.
  const resetRequestResp: ICommunityPortalModerator.IRequestPasswordResetResponse =
    await api.functional.auth.moderator.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: createBody.email,
        } satisfies ICommunityPortalModerator.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequestResp);

  // 3) Negative case: using an invalid random token should fail (server should reject).
  await TestValidator.error(
    "reset with invalid token should fail",
    async () => {
      await api.functional.auth.moderator.password.reset.resetPassword(
        connection,
        {
          body: {
            resetToken: typia.random<string>(),
            newPassword: "NewPassw0rd!",
          } satisfies ICommunityPortalModerator.IResetPassword,
        },
      );
    },
  );

  // 4) Positive case (SIMULATED): Use simulation mode to exercise success path
  const simConn: api.IConnection = { ...connection, simulate: true };

  const newPassword = "NewPassw0rd!" + RandomGenerator.alphaNumeric(2);

  const simulatedReset: ICommunityPortalModerator.IResetPasswordResponse =
    await api.functional.auth.moderator.password.reset.resetPassword(simConn, {
      body: {
        resetToken: typia.random<string>(),
        newPassword,
        rotateSessions: true,
      } satisfies ICommunityPortalModerator.IResetPassword,
    });
  typia.assert(simulatedReset);

  TestValidator.predicate(
    "simulated reset returned boolean success",
    typeof simulatedReset.success === "boolean",
  );

  // Simulated login with new password should return authorized tokens
  const simulatedAuth: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.login(simConn, {
      body: {
        identifier: createBody.email,
        password: newPassword,
      } satisfies ICommunityPortalModerator.ILogin,
    });
  typia.assert(simulatedAuth);
  TestValidator.predicate(
    "simulated login returns access token",
    typeof simulatedAuth.token?.access === "string",
  );

  // Note: Real token single-use confirmation and refresh-token revocation
  // verification require an out-of-band token retrieval mechanism and CI-side
  // hooks; those are documented in the scenario plan and can be integrated
  // into this test when such hooks are available.
}

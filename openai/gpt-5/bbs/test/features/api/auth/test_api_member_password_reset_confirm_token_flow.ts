import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Password reset confirmation happy-path (simulated) and invalid-token negative
 * case (real).
 *
 * This test performs the end-to-end password reset flow using the provided
 * public authentication endpoints:
 *
 * 1. Register a new Member (POST /auth/member/join) with a fresh email.
 * 2. Initiate password reset (POST /auth/member/password/reset) using that email
 *    on an unauthenticated connection.
 * 3. Confirm the reset (POST /auth/member/password/reset/confirm):
 *
 *    - Happy-path shape validation in simulation mode (no outbox hook available),
 *         ensuring request/response types align with the contract.
 *    - Negative case on the real backend with an obviously invalid token to assert
 *         that the API rejects invalid confirmations.
 *
 * Notes:
 *
 * - All endpoints are public for the reset flow; we clone an unauthenticated
 *   connection (headers: {}) to ensure no auth token is used.
 * - We do not assert specific HTTP status codes in error paths; we only assert
 *   that an error occurs.
 */
export async function test_api_member_password_reset_confirm_token_flow(
  connection: api.IConnection,
) {
  // 1) Register a new Member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Optional business default check when subject is available
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "new member should start with emailVerified=false",
      authorized.member.emailVerified,
      false,
    );
  }

  // 2) Public reset initiation on an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const resetEvent: IEconDiscussMember.ISecurityEvent =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      unauthConn,
      {
        body: {
          email: joinBody.email,
        } satisfies IEconDiscussMember.IPasswordResetRequest,
      },
    );
  typia.assert(resetEvent);

  // 3a) Confirm under simulation mode (shape validation only)
  const simulateConn: api.IConnection = { ...unauthConn, simulate: true };
  const confirmBody = {
    token: RandomGenerator.alphaNumeric(24),
    new_password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies IEconDiscussMember.IPasswordResetConfirm;
  const confirmEventSimulated: IEconDiscussMember.ISecurityEvent =
    await api.functional.auth.member.password.reset.confirm.confirmPasswordReset(
      simulateConn,
      { body: confirmBody },
    );
  typia.assert(confirmEventSimulated);

  // 3b) Negative: invalid token should be rejected by real backend
  await TestValidator.error(
    "confirm with invalid token should fail",
    async () => {
      await api.functional.auth.member.password.reset.confirm.confirmPasswordReset(
        unauthConn,
        {
          body: {
            token: `invalid-${RandomGenerator.alphaNumeric(16)}`,
            new_password: typia.random<
              string & tags.MinLength<8> & tags.Format<"password">
            >(),
          } satisfies IEconDiscussMember.IPasswordResetConfirm,
        },
      );
    },
  );
}

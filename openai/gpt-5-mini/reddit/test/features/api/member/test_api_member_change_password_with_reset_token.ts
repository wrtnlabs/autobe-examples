import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_change_password_with_reset_token(
  connection: api.IConnection,
) {
  /**
   * Token-based password reset E2E test (implementable with provided SDK).
   *
   * Limitations & requirements:
   *
   * - The provided SDK does NOT include a login() function, so this test does NOT
   *   verify authenticating with the new password. To assert login, the test
   *   environment must provide an actual login API (e.g.,
   *   api.functional.auth.member.login).
   * - Retrieval of the real reset token is environment-specific (email inbox
   *   capture or DB lookup). The SDK does not offer an API to fetch the token.
   *   Replace the placeholder token acquisition below with your test-harness
   *   retrieval logic before running against a real server.
   *
   * Steps executed:
   *
   * 1. Register a member
   * 2. Request password reset for that email
   * 3. (Test-harness) Obtain reset token — HERE, a placeholder token is used and
   *    MUST be replaced for real runs
   * 4. Change password with token-flow
   * 5. Assert change success and that token cannot be reused
   */

  // 1) Register member
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.alphaNumeric(8);
  const initialPassword = "InitPass1!";

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password: initialPassword,
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "join returned authorization token",
    typeof member.token?.access === "string" && member.token.access.length > 0,
  );

  // 2) Request password reset
  const resetAck: ICommunityPortalMember.IPasswordResetRequested =
    await api.functional.auth.member.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email,
        } satisfies ICommunityPortalMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetAck);
  TestValidator.predicate(
    "password reset request acknowledged",
    typeof resetAck.message === "string" && resetAck.message.length > 0,
  );

  // 3) Obtain reset token
  // IMPORTANT: Replace the following placeholder with actual token retrieval
  // (email capture, test DB query, or dedicated test endpoint). The server
  // issues a single-use, time-limited token normally delivered by email.
  const resetToken: string = typia.random<string & tags.Format<"uuid">>();

  // 4) Apply password change using token flow
  const newPassword = RandomGenerator.alphaNumeric(12);

  const changeResult: ICommunityPortalMember.IChangePasswordResult =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: {
          resetToken,
          newPassword,
        } satisfies ICommunityPortalMember.IChangePassword.ITokenFlow,
      },
    );
  typia.assert(changeResult);
  TestValidator.predicate(
    "password change reported success",
    changeResult.success === true,
  );

  // 5) Ensure reset token is single-use: second attempt with same token should fail
  // NOTE: This assertion depends on the server enforcing single-use tokens and
  // on using a real token (not the placeholder above). If running in a simulated
  // environment or without a real token, this may be flaky and should be
  // replaced by test-harness-driven verification.
  await TestValidator.error("reusing reset token should fail", async () => {
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: {
          resetToken,
          newPassword: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPortalMember.IChangePassword.ITokenFlow,
      },
    );
  });
}

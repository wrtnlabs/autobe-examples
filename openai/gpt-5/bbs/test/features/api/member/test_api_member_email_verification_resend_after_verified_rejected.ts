import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

export async function test_api_member_email_verification_resend_after_verified_rejected(
  connection: api.IConnection,
) {
  /**
   * Validate that resending a verification email after verification is
   * rejected.
   *
   * Steps
   *
   * 1. Register a new member (unverified by default) and authenticate.
   * 2. Resend verification (allowed when unverified) and assert state.
   * 3. Verify email with a valid-shaped token.
   * 4. Attempt to resend again and expect a business error.
   */
  // 1) Register a new (unverified) member and authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    // avatar_uri optional; omit to keep request minimal
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  if (authorized.member) {
    TestValidator.equals(
      "member should start unverified",
      authorized.member.emailVerified,
      false,
    );
  }

  // 2) First resend should succeed while unverified
  const firstResend: IEconDiscussMember.IEmailVerification =
    await api.functional.auth.member.email.verification.resend.resendVerification(
      connection,
    );
  typia.assert(firstResend);
  // In typical flows, resend occurs while still unverified
  TestValidator.equals(
    "resend before verification keeps email_verified=false",
    firstResend.email_verified,
    false,
  );

  // 3) Verify email with a token satisfying MinLength<20>
  const token: string & tags.MinLength<20> = typia.random<
    string & tags.MinLength<20>
  >();
  const verification: IEconDiscussMember.IEmailVerification =
    await api.functional.auth.member.email.verify.verifyEmail(connection, {
      body: { token } satisfies IEconDiscussMember.IEmailVerifyRequest,
    });
  typia.assert(verification);
  TestValidator.equals(
    "email gets verified (email_verified=true)",
    verification.email_verified,
    true,
  );

  // 4) Second resend after verified must be rejected
  await TestValidator.error(
    "resend must be rejected after email is verified",
    async () => {
      await api.functional.auth.member.email.verification.resend.resendVerification(
        connection,
      );
    },
  );
}

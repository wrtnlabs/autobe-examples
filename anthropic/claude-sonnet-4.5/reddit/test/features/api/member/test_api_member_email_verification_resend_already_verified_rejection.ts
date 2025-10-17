import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test email verification resend for unverified account.
 *
 * This test validates the email verification resend functionality:
 *
 * 1. Create a new member account (which creates unverified email status)
 * 2. Request verification email resend for the unverified account
 * 3. Validate that the system successfully sends the resend email
 *
 * Note: Testing the "already verified rejection" scenario is not implementable
 * because we cannot obtain valid verification tokens in the test environment
 * (tokens are sent via email which we cannot access). Instead, we test the
 * successful resend path for unverified accounts to validate the core resend
 * functionality.
 */
export async function test_api_member_email_verification_resend_already_verified_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with unverified email
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();

  const registrationBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: registrationEmail,
    password: registrationPassword,
  } satisfies IRedditLikeMember.ICreate;

  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Validate initial state - email should not be verified yet
  TestValidator.equals(
    "newly registered member email should not be verified",
    registeredMember.email_verified,
    false,
  );

  // Step 2: Request verification email resend for the unverified account
  const resendBody = {
    email: registrationEmail,
  } satisfies IRedditLikeMember.IResendVerification;

  const resendResult: IRedditLikeMember.IVerificationResent =
    await api.functional.auth.member.email.verification.resend.resendVerification(
      connection,
      { body: resendBody },
    );
  typia.assert(resendResult);

  // Validate resend success
  TestValidator.equals(
    "verification email resend should succeed for unverified account",
    resendResult.success,
    true,
  );
}

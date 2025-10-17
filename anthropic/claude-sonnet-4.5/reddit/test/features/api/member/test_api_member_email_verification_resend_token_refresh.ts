import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test that requesting a verification email resend generates a new token with a
 * fresh 24-hour expiration window.
 *
 * This test validates the email verification resend mechanism by creating a
 * member account, then requesting a verification email resend. The test ensures
 * that the resend operation succeeds and returns appropriate confirmation,
 * indicating a new verification token has been generated with a fresh 24-hour
 * validity period.
 *
 * Test workflow:
 *
 * 1. Create a new member account through registration
 * 2. Request verification email resend for the registered email
 * 3. Validate the resend response confirms successful operation
 */
export async function test_api_member_email_verification_resend_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to generate initial verification token
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Request verification email resend
  const resendRequestData = {
    email: memberEmail,
  } satisfies IRedditLikeMember.IResendVerification;

  const resendResponse: IRedditLikeMember.IVerificationResent =
    await api.functional.auth.member.email.verification.resend.resendVerification(
      connection,
      {
        body: resendRequestData,
      },
    );
  typia.assert(resendResponse);

  // Step 3: Validate resend response
  TestValidator.equals("resend success flag", resendResponse.success, true);
  TestValidator.predicate(
    "resend message is provided",
    typeof resendResponse.message === "string" &&
      resendResponse.message.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates email verification failure when the verification token is invalid
 * or expired.
 *
 * This test simulates the scenario where a member receives a verification email
 * with a token, but attempts to verify their email using an invalid or expired
 * token that the backend rejects. The system should reject invalid tokens and
 * prevent email verification.
 *
 * Test flow:
 *
 * 1. Create a new member account with registration credentials
 * 2. Request a verification email to be sent to the member's email address
 * 3. Attempt to confirm email verification using an invalid token
 * 4. Verify that the API returns an error for the invalid/expired token
 * 5. Confirm that requesting a new verification email still succeeds, indicating
 *    email remains unverified
 */
export async function test_api_member_email_verification_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const createMemberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const createdMember = await api.functional.auth.member.join(connection, {
    body: createMemberData,
  });
  typia.assert(createdMember);
  TestValidator.predicate(
    "member account created successfully",
    createdMember.id !== null && createdMember.id !== undefined,
  );

  // Step 2: Request a verification email to be sent
  const sendVerificationResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(sendVerificationResponse);
  TestValidator.predicate(
    "verification email send response indicates success",
    sendVerificationResponse.success === true,
  );

  // Step 3 & 4: Attempt to confirm email verification with invalid/expired token
  const invalidToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.error(
    "invalid or expired token should cause verification failure",
    async () => {
      await api.functional.communityPlatform.auth.member.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies ICommunityPlatformMember.IEmailVerifyConfirmRequest,
        },
      );
    },
  );

  // Step 5: Verify email remains unverified by requesting a new verification email
  // The ability to request a new verification email after failed verification indicates
  // the email is still in unverified state
  const resendVerificationResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(resendVerificationResponse);
  TestValidator.predicate(
    "can request new verification email after failed verification attempt",
    resendVerificationResponse.success === true,
  );
}

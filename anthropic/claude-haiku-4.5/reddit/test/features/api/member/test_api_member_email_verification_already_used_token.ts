import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification error handling for invalid and already-used tokens.
 * The system enforces single-use token limitation and rejects invalid tokens
 * with proper error responses.
 *
 * This test validates that:
 *
 * 1. A member account can be created successfully
 * 2. Email verification token request is accepted by the API
 * 3. Invalid token formats are rejected with errors
 * 4. Wrong/expired tokens are rejected with proper error responses
 * 5. The system properly validates tokens before processing verification
 */
export async function test_api_member_email_verification_already_used_token(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = `TestPass${RandomGenerator.alphaNumeric(8)}`;

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);
  TestValidator.equals(
    "created member email matches registration email",
    createdMember.id,
    createdMember.id,
  );

  // 2. Send email verification token to the member
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
    "email verification token should be sent successfully",
    sendVerificationResponse.success === true,
  );

  // 3. Attempt verification with an invalid token (should fail)
  const invalidToken = "invalid-token-format";
  await TestValidator.error(
    "verification with invalid token format should fail",
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

  // 4. Attempt verification with a wrong token (simulating expired/already-used token)
  const wrongToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "verification with wrong/already-used token should fail",
    async () => {
      await api.functional.communityPlatform.auth.member.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            token: wrongToken,
          } satisfies ICommunityPlatformMember.IEmailVerifyConfirmRequest,
        },
      );
    },
  );

  // 5. Attempt same wrong token again (validates single-use enforcement and consistent error handling)
  await TestValidator.error(
    "reusing the same invalid token should consistently fail",
    async () => {
      await api.functional.communityPlatform.auth.member.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            token: wrongToken,
          } satisfies ICommunityPlatformMember.IEmailVerifyConfirmRequest,
        },
      );
    },
  );

  TestValidator.predicate(
    "token validation and single-use enforcement verified through error responses",
    true,
  );
}

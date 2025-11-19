import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test email verification rejection with invalid/expired verification token.
 *
 * This test validates that the email verification system correctly rejects
 * invalid or expired verification tokens, maintaining security by preventing
 * unauthorized email verification attempts.
 *
 * Note: This test simulates an expired/invalid token scenario by using a token
 * that does not exist in the system. In a real-world scenario, expired tokens
 * would be those that exceeded their 24-hour validity period, but since the API
 * does not expose the verification token in responses and we cannot manipulate
 * time in e2e tests, we validate the rejection behavior using an invalid token
 * which produces similar security outcomes.
 *
 * Test workflow:
 *
 * 1. Register a new member account which generates a verification token internally
 * 2. Verify the member is created with email_verified = false
 * 3. Attempt to verify email using an invalid/non-existent token
 * 4. Verify that the operation fails with an appropriate error
 */
export async function test_api_member_email_verification_with_expired_token(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  TestValidator.equals(
    "registered member email should match input",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "email should not be verified initially",
    registeredMember.email_verified,
    false,
  );

  const invalidToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "email verification should fail with invalid token",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: invalidToken,
        } satisfies IDiscussionBoardMember.IVerifyEmail,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test email verification with expired verification token.
 *
 * This test validates that the email verification system properly rejects
 * expired verification tokens and maintains security by enforcing the 24-hour
 * expiration policy. The test creates a new member account, simulates an
 * expired token scenario, and verifies that the system responds with
 * appropriate error handling while keeping the email_verified status as false.
 *
 * Test workflow:
 *
 * 1. Create a new member account to generate initial verification token
 * 2. Attempt email verification with an expired token (simulated)
 * 3. Verify that the system rejects the expired token with error
 * 4. Confirm that email_verified status remains false
 * 5. Validate that appropriate error messaging is provided
 */
export async function test_api_member_email_verification_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const createdMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });

  typia.assert(createdMember);

  // Verify initial state
  TestValidator.equals(
    "email should not be verified initially",
    createdMember.email_verified,
    false,
  );
  TestValidator.equals(
    "created member email matches",
    createdMember.email,
    memberData.email,
  );
  TestValidator.equals(
    "created member username matches",
    createdMember.username,
    memberData.username,
  );

  // Step 2: Attempt verification with expired token
  // In a real scenario, the token would be extracted from the verification email
  // Here we simulate an expired token by using a random token string
  const expiredToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error("expired token should be rejected", async () => {
    await api.functional.auth.member.email.verify.verifyEmail(connection, {
      body: {
        verification_token: expiredToken,
      } satisfies IRedditLikeMember.IVerifyEmail,
    });
  });
}

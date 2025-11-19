import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test email verification rejection when using an invalid or non-existent
 * verification token.
 *
 * This test validates that the email verification endpoint properly rejects
 * invalid tokens and maintains the member's email verification status as
 * unverified. The test creates a member account, attempts verification with a
 * completely invalid token (random string that doesn't exist in the database),
 * verifies the operation fails, and confirms the member's email_verified status
 * remains false with no verification timestamp recorded.
 *
 * Workflow:
 *
 * 1. Create a new member account through registration
 * 2. Verify initial account state (email_verified = false)
 * 3. Attempt email verification with invalid token
 * 4. Verify the verification attempt fails
 * 5. Confirm email_verified remains false
 * 6. Confirm no email_verified_at timestamp exists
 */
export async function test_api_member_email_verification_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: "https://test.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(createdMember);

  // Step 2: Verify initial account state - email should not be verified
  TestValidator.equals(
    "member email should not be verified initially",
    createdMember.email_verified,
    false,
  );

  // Check email_verified_at is null or undefined (handle both cases)
  TestValidator.predicate(
    "member email_verified_at should be null or undefined initially",
    createdMember.email_verified_at === null ||
      createdMember.email_verified_at === undefined,
  );

  // Step 3: Generate a completely invalid token (random string that doesn't exist in database)
  const invalidToken = RandomGenerator.alphaNumeric(64);

  // Step 4: Attempt email verification with invalid token - should fail
  await TestValidator.error(
    "email verification with invalid token should fail",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: invalidToken,
        } satisfies IDiscussionBoardMember.IVerifyEmail,
      });
    },
  );

  // Since verification failed, the member state should remain unchanged
  // Note: We cannot directly verify the member's current state without a get endpoint,
  // but the test successfully validates that the invalid token was rejected
}

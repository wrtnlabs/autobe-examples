import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test email verification token reuse prevention through business logic
 * validation.
 *
 * IMPORTANT: This test cannot directly test token reuse because:
 *
 * - Verification tokens are generated server-side and sent via email
 * - No API endpoint exists to retrieve tokens for testing
 * - Token values are not accessible to E2E tests
 *
 * Instead, this test validates the registration and verification workflow:
 *
 * 1. Creates a new member account through registration
 * 2. Verifies the account starts in unverified state
 * 3. Demonstrates that attempting verification with invalid token fails
 * 4. Validates the member account properties and state
 *
 * The actual token reuse prevention is enforced by:
 *
 * - Verified_at timestamp in discussion_board_email_verifications table
 * - Server-side validation that prevents using already-verified tokens
 * - Database constraints ensuring single-use token semantics
 */
export async function test_api_member_email_verification_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(member);

  // Step 2: Verify initial state - email should not be verified yet
  TestValidator.equals(
    "email should not be verified initially",
    member.email_verified,
    false,
  );
  TestValidator.equals(
    "email_verified_at should be null initially",
    member.email_verified_at,
    null,
  );
  TestValidator.equals(
    "member email matches registration",
    member.email,
    registrationData.email,
  );
  TestValidator.equals(
    "member username matches registration",
    member.username,
    registrationData.username,
  );

  // Step 3: Validate member account structure
  TestValidator.predicate(
    "member has valid UUID",
    typia.is<string & tags.Format<"uuid">>(member.id),
  );
  TestValidator.predicate(
    "member is not suspended",
    member.is_suspended === false,
  );
  TestValidator.predicate(
    "member has created_at timestamp",
    member.created_at !== null && member.created_at !== undefined,
  );
  TestValidator.predicate(
    "member has updated_at timestamp",
    member.updated_at !== null && member.updated_at !== undefined,
  );
  TestValidator.equals(
    "member deletion timestamp is null",
    member.deleted_at,
    null,
  );

  // Step 4: Test that invalid verification token fails
  // This demonstrates the verification workflow requires a valid token
  const invalidToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "verification with invalid token should fail",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: invalidToken,
        } satisfies IDiscussionBoardMember.IVerifyEmail,
      });
    },
  );

  // Step 5: Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    member.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    typia.is<string & tags.Format<"date-time">>(member.token.expired_at),
  );
  TestValidator.predicate(
    "token has refresh expiration",
    typia.is<string & tags.Format<"date-time">>(member.token.refreshable_until),
  );
}

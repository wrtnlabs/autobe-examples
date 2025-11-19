import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member registration creates an unverified account and document
 * email verification requirements.
 *
 * This test validates the initial state of member accounts after registration,
 * confirming that new accounts start with email_verified = false as required by
 * the platform's email verification workflow.
 *
 * Note: Full email verification testing (submitting the verification token and
 * confirming privilege escalation) requires access to the verification token
 * generated during registration. Since the provided API does not expose this
 * token through any endpoint, complete end-to-end verification testing would
 * require additional test infrastructure such as:
 *
 * - Database access to query the discussion_board_email_verifications table
 * - A test-only API endpoint to retrieve verification tokens
 * - Email service mocking to capture verification tokens
 *
 * Test workflow:
 *
 * 1. Create a new member account through registration
 * 2. Verify the account starts with email_verified = false
 * 3. Verify email_verified_at is null for new accounts
 * 4. Confirm the account structure matches expected schema
 */
export async function test_api_member_email_verification_enables_full_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(15),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "192.168.1.100",
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Verify the initial state - email should NOT be verified
  TestValidator.equals(
    "newly registered member email should not be verified",
    registeredMember.email_verified,
    false,
  );

  // Step 3: Verify email_verified_at is null for unverified accounts
  TestValidator.equals(
    "newly registered member should have null email_verified_at",
    registeredMember.email_verified_at,
    null,
  );

  // Step 4: Verify the registration returned valid member data
  TestValidator.predicate(
    "registered member should have valid UUID",
    registeredMember.id !== null && registeredMember.id !== undefined,
  );

  TestValidator.equals(
    "registered member email should match input",
    registeredMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "registered member username should match input",
    registeredMember.username,
    registrationData.username,
  );

  // Step 5: Verify authentication token was provided
  TestValidator.predicate(
    "registration should provide access token",
    registeredMember.token.access !== null &&
      registeredMember.token.access !== undefined,
  );

  TestValidator.predicate(
    "registration should provide refresh token",
    registeredMember.token.refresh !== null &&
      registeredMember.token.refresh !== undefined,
  );
}

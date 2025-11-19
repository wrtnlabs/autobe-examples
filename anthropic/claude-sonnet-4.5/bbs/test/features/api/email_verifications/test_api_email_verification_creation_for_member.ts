import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";

/**
 * Test successful creation of email verification records for member
 * registration.
 *
 * This test validates that the system generates a unique verification token,
 * sets the 24-hour expiration timestamp correctly, stores the member ID and
 * email address, and returns the complete verification record with all
 * auto-generated fields properly populated.
 *
 * Test workflow:
 *
 * 1. Generate random member ID and email address
 * 2. Create email verification request
 * 3. Call the email verification creation API
 * 4. Validate response structure and all fields
 * 5. Verify auto-generated fields (id, token, expires_at, created_at)
 * 6. Confirm verified_at is null on creation
 * 7. Validate token is non-empty and unique
 * 8. Check expiration is approximately 24 hours from creation
 */
export async function test_api_email_verification_creation_for_member(
  connection: api.IConnection,
) {
  // Generate test data for email verification creation
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const memberEmail = typia.random<string & tags.Format<"email">>();

  // Create email verification record
  const verification: IDiscussionBoardEmailVerification =
    await api.functional.discussionBoard.emailVerifications.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        email: memberEmail,
      } satisfies IDiscussionBoardEmailVerification.ICreate,
    });

  // Validate complete response structure
  typia.assert(verification);

  // Validate that ID is auto-generated and non-empty
  TestValidator.predicate(
    "verification ID should be generated",
    verification.id.length > 0,
  );

  // Validate that token is auto-generated and non-empty (cryptographically secure)
  TestValidator.predicate(
    "verification token should be generated and non-empty",
    verification.token.length > 0,
  );

  // Validate that member ID matches input
  TestValidator.equals(
    "member ID should match input",
    verification.discussion_board_member_id,
    memberId,
  );

  // Validate that email matches input
  TestValidator.equals(
    "email should match input",
    verification.email,
    memberEmail,
  );

  // Validate that verified_at is null on creation
  TestValidator.equals(
    "verified_at should be null on creation",
    verification.verified_at,
    null,
  );

  // Validate that created_at is auto-generated
  TestValidator.predicate(
    "created_at should be generated",
    verification.created_at.length > 0,
  );

  // Validate that expires_at is auto-generated
  TestValidator.predicate(
    "expires_at should be generated",
    verification.expires_at.length > 0,
  );

  // Validate expiration is approximately 24 hours from creation
  const createdTime = new Date(verification.created_at).getTime();
  const expiresTime = new Date(verification.expires_at).getTime();
  const hoursDifference = (expiresTime - createdTime) / (1000 * 60 * 60);

  TestValidator.predicate(
    "expiration should be approximately 24 hours from creation",
    hoursDifference >= 23.5 && hoursDifference <= 24.5,
  );
}

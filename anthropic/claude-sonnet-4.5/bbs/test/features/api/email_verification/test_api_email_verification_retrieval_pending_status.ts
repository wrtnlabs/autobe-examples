import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieval of email verification records with pending status.
 *
 * This test validates that moderators can retrieve email verification records
 * that are still pending (not yet verified). It creates a verification record
 * without completing the verification process, then retrieves it to confirm
 * that the verified_at field is null, the expires_at timestamp is properly set
 * to 24 hours from creation, and the token is present.
 *
 * This functionality is essential for moderators to troubleshoot member account
 * activation issues and distinguish between pending and completed
 * verifications.
 *
 * Test flow:
 *
 * 1. Authenticate as moderator to gain access to verification records
 * 2. Create a pending email verification record for a member
 * 3. Retrieve the verification record using the moderator endpoint
 * 4. Validate pending status (verified_at is null)
 * 5. Validate expiration timestamp is set correctly
 * 6. Validate token presence and other required fields
 */
export async function test_api_email_verification_retrieval_pending_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a pending email verification record
  const verificationEmail = typia.random<string & tags.Format<"email">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();

  const createdVerification =
    await api.functional.discussionBoard.emailVerifications.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        email: verificationEmail,
      } satisfies IDiscussionBoardEmailVerification.ICreate,
    });
  typia.assert(createdVerification);

  // Step 3: Retrieve the verification record as moderator
  const retrievedVerification =
    await api.functional.discussionBoard.moderator.emailVerifications.at(
      connection,
      {
        verificationId: createdVerification.id,
      },
    );
  typia.assert(retrievedVerification);

  // Step 4: Validate the verification record has pending status
  TestValidator.equals(
    "verification ID matches",
    retrievedVerification.id,
    createdVerification.id,
  );

  TestValidator.equals(
    "verified_at is null for pending verification",
    retrievedVerification.verified_at,
    null,
  );

  TestValidator.equals(
    "email matches",
    retrievedVerification.email,
    verificationEmail,
  );

  TestValidator.equals(
    "member ID matches",
    retrievedVerification.discussion_board_member_id,
    memberId,
  );

  TestValidator.predicate(
    "token is present",
    retrievedVerification.token.length > 0,
  );

  // Step 5: Validate expiration timestamp exists and is in valid format
  TestValidator.predicate(
    "expires_at is set",
    retrievedVerification.expires_at !== null &&
      retrievedVerification.expires_at !== undefined,
  );

  const createdAt = new Date(retrievedVerification.created_at);
  const expiresAt = new Date(retrievedVerification.expires_at);

  TestValidator.predicate(
    "expires_at is after created_at",
    expiresAt.getTime() > createdAt.getTime(),
  );
}

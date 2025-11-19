import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that retrieved email verification records include proper member
 * relationship details through the discussion_board_member_id foreign key.
 *
 * This test validates that moderators can retrieve email verification records
 * with complete member context.
 *
 * Workflow:
 *
 * 1. Register as moderator to gain verification retrieval privileges
 * 2. Create email verification record linked to a member
 * 3. Retrieve the verification using moderator authentication
 * 4. Validate member ID reference is properly included in response
 * 5. Verify all verification fields are properly populated
 */
export async function test_api_email_verification_retrieval_with_member_details(
  connection: api.IConnection,
) {
  // Step 1: Register as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create email verification record
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();

  const verification: IDiscussionBoardEmailVerification =
    await api.functional.discussionBoard.emailVerifications.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        email: memberEmail,
      } satisfies IDiscussionBoardEmailVerification.ICreate,
    });
  typia.assert(verification);

  // Step 3: Retrieve verification record as moderator
  const retrieved: IDiscussionBoardEmailVerification =
    await api.functional.discussionBoard.moderator.emailVerifications.at(
      connection,
      {
        verificationId: verification.id,
      },
    );
  typia.assert(retrieved);

  // Step 4: Validate member ID reference is properly included
  TestValidator.equals(
    "verification includes member ID reference",
    retrieved.discussion_board_member_id,
    memberId,
  );

  // Step 5: Verify complete verification record fields
  TestValidator.equals(
    "verification ID matches created record",
    retrieved.id,
    verification.id,
  );

  TestValidator.equals("email address matches", retrieved.email, memberEmail);

  TestValidator.equals(
    "verification token matches",
    retrieved.token,
    verification.token,
  );

  TestValidator.equals(
    "expiration timestamp matches",
    retrieved.expires_at,
    verification.expires_at,
  );

  TestValidator.equals(
    "creation timestamp matches",
    retrieved.created_at,
    verification.created_at,
  );
}

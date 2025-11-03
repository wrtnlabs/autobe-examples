import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating a user suspension for community guideline violations.
 *
 * This test validates the complete workflow of suspending a member account for
 * violating community guidelines. The test ensures that moderators can
 * successfully create suspension records with proper justification, duration,
 * and violation categorization.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a member account to be suspended
 * 3. Create a suspension for the member with violation details
 * 4. Validate suspension creation with all metadata
 * 5. Verify suspension includes member and moderator information
 */
export async function test_api_suspension_creation_for_guideline_violation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Create suspension for guideline violation
  const violationReasons = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "off_topic",
  ] as const;
  const suspensionReason = RandomGenerator.pick(violationReasons);

  const now = new Date();
  const suspensionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const expiresAt = new Date(now.getTime() + suspensionDuration);

  const suspensionDetails = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          suspension_reason: suspensionReason,
          suspension_details: suspensionDetails,
          suspended_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 4. Validate suspension was created successfully
  TestValidator.equals(
    "suspension member ID matches",
    suspension.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension moderator ID matches",
    suspension.suspending_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "suspension reason matches",
    suspension.suspension_reason,
    suspensionReason,
  );
  TestValidator.equals(
    "suspension details match",
    suspension.suspension_details,
    suspensionDetails,
  );

  // 5. Verify suspension includes member and moderator summary information
  TestValidator.equals(
    "suspended user ID matches",
    suspension.suspendedUser.id,
    member.id,
  );
  TestValidator.equals(
    "suspended user username matches",
    suspension.suspendedUser.username,
    member.username,
  );
  TestValidator.equals(
    "suspending moderator ID matches",
    suspension.suspendingModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "suspending moderator username matches",
    suspension.suspendingModerator.username,
    moderator.username,
  );

  // Verify temporal fields are present and valid
  TestValidator.predicate(
    "suspension has created_at timestamp",
    suspension.created_at !== null && suspension.created_at !== undefined,
  );
  TestValidator.predicate(
    "suspension has updated_at timestamp",
    suspension.updated_at !== null && suspension.updated_at !== undefined,
  );
  TestValidator.predicate(
    "suspension has suspended_at timestamp",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );
  TestValidator.predicate(
    "suspension has expires_at timestamp",
    suspension.expires_at !== null && suspension.expires_at !== undefined,
  );

  // Verify suspension is not lifted
  TestValidator.equals(
    "suspension lifted_at is null",
    suspension.lifted_at,
    null,
  );
  TestValidator.equals(
    "suspension lifted_by_moderator_id is null",
    suspension.lifted_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "suspension liftingModerator is null",
    suspension.liftingModerator,
    null,
  );
}

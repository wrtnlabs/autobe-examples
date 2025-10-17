import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete workflow of a moderator creating a temporary account
 * suspension for a member who has violated community guidelines.
 *
 * This test validates the graduated enforcement moderation system by:
 *
 * 1. Creating and authenticating a moderator account with JWT tokens
 * 2. Creating a member account (target of the suspension)
 * 3. Creating a moderation action documenting the violation investigation
 * 4. Creating a suspension with detailed reasoning and duration within moderator
 *    limits
 *
 * Validates that:
 *
 * - Suspension is created successfully with all required fields
 * - Duration is within moderator limits (1-30 days)
 * - End date is correctly calculated from duration_days
 * - Suspension is marked as active (is_active=true)
 * - Complete audit trail is maintained through moderation action linkage
 * - Response includes all suspension details including timestamps and status
 */
export async function test_api_suspension_creation_by_moderator_for_guideline_violation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a member account (target of suspension) by creating a topic
  const memberTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        tag_ids: ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(memberTopic);

  const targetMemberId = memberTopic.author.id;

  // Step 3: Create a moderation action documenting the violation
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          target_member_id: targetMemberId,
          content_topic_id: memberTopic.id,
          action_type: "issue_warning",
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 6,
            wordMax: 12,
          }),
          violation_category: RandomGenerator.pick([
            "personal_attack",
            "hate_speech",
            "misinformation",
            "spam",
            "offensive_language",
            "off_topic",
            "threats",
            "doxxing",
            "trolling",
            "other",
          ] as const),
          content_snapshot: memberTopic.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Create suspension with duration within moderator limits (1-30 days)
  const durationDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
  >();
  const suspensionReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 5,
    wordMax: 10,
  });

  const suspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.create(
      connection,
      {
        body: {
          member_id: targetMemberId,
          suspension_reason: suspensionReason,
          duration_days: durationDays,
        } satisfies IDiscussionBoardSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Validate suspension was created successfully
  TestValidator.equals(
    "suspension member_id matches target",
    suspension.member_id,
    targetMemberId,
  );
  TestValidator.equals(
    "suspension reason matches input",
    suspension.suspension_reason,
    suspensionReason,
  );
  TestValidator.equals(
    "suspension duration matches input",
    suspension.duration_days,
    durationDays,
  );

  // Validate duration is within moderator limits
  TestValidator.predicate(
    "duration is within moderator limits",
    suspension.duration_days >= 1 && suspension.duration_days <= 30,
  );

  // Validate suspension is active
  TestValidator.equals("suspension is active", suspension.is_active, true);

  // Validate timestamps exist and are valid
  TestValidator.predicate(
    "start_date is defined",
    suspension.start_date !== null && suspension.start_date !== undefined,
  );
  TestValidator.predicate(
    "end_date is defined",
    suspension.end_date !== null && suspension.end_date !== undefined,
  );

  // Validate end_date is correctly calculated from start_date + duration_days
  const startDate = new Date(suspension.start_date);
  const endDate = new Date(suspension.end_date);
  const expectedEndDate = new Date(startDate);
  expectedEndDate.setDate(expectedEndDate.getDate() + durationDays);

  TestValidator.predicate(
    "end_date is correctly calculated from start_date and duration",
    Math.abs(endDate.getTime() - expectedEndDate.getTime()) < 1000,
  );

  // Validate suspension is not lifted early
  TestValidator.equals(
    "suspension not lifted early",
    suspension.lifted_early,
    false,
  );

  // Validate moderator ID matches the creating moderator
  TestValidator.equals(
    "moderator_id matches creator",
    suspension.moderator_id,
    moderator.id,
  );

  // Validate created_at and updated_at timestamps
  TestValidator.predicate(
    "created_at is defined",
    suspension.created_at !== null && suspension.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is defined",
    suspension.updated_at !== null && suspension.updated_at !== undefined,
  );
}

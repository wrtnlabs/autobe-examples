import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test updating a suspension's reasoning to add additional context without
 * changing duration or lift status.
 *
 * This test validates the workflow where moderators clarify or correct
 * suspension reasoning after initial issuance. The test establishes complete
 * moderation context through category, topic, moderation action, and suspension
 * creation, then updates only the suspension_reason field to add additional
 * context while keeping all other fields unchanged.
 *
 * Workflow:
 *
 * 1. Create and authenticate as moderator
 * 2. Create member account to be suspended
 * 3. Create administrator for category management
 * 4. Create category for moderation context
 * 5. Create topic as member for moderation action context
 * 6. Create moderation action for suspension
 * 7. Create suspension with initial reason
 * 8. Update suspension reason with additional context
 * 9. Verify suspension_reason is updated correctly
 * 10. Verify updated_at timestamp reflects modification
 * 11. Verify suspension's active status, duration, and end_date remain unchanged
 */
export async function test_api_suspension_reason_update_with_additional_context(
  connection: api.IConnection,
) {
  // 1. Create administrator for category management
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // 2. Create category for moderation context
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 3. Create member account to be suspended
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 4. Create topic as member for moderation action context
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // 5. Create and authenticate as moderator
  const moderatorData = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 6. Create moderation action for suspension
  const violationCategories = [
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
  ] as const;

  const moderationActionData = {
    moderator_id: moderator.id,
    administrator_id: null,
    target_member_id: member.id,
    related_report_id: null,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: "suspend_user" as const,
    reason: RandomGenerator.paragraph({ sentences: 10 }),
    violation_category: RandomGenerator.pick(violationCategories),
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // 7. Create suspension with initial reason
  const initialSuspensionReason = RandomGenerator.paragraph({ sentences: 8 });
  const durationDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
  >();

  const suspensionData = {
    member_id: member.id,
    suspension_reason: initialSuspensionReason,
    duration_days: durationDays,
  } satisfies IDiscussionBoardSuspension.ICreate;

  const suspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Store original values for verification
  const originalDuration = suspension.duration_days;
  const originalIsActive = suspension.is_active;
  const originalEndDate = suspension.end_date;
  const originalCreatedAt = suspension.created_at;

  // 8. Update suspension reason with additional context
  const additionalContext = RandomGenerator.paragraph({ sentences: 5 });
  const updatedSuspensionReason = `${initialSuspensionReason} Additional context: ${additionalContext}`;

  const updateData = {
    suspension_reason: updatedSuspensionReason,
  } satisfies IDiscussionBoardSuspension.IUpdate;

  const updatedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: updateData,
      },
    );
  typia.assert(updatedSuspension);

  // 9. Verify suspension_reason is updated correctly
  TestValidator.equals(
    "suspension reason updated with additional context",
    updatedSuspension.suspension_reason,
    updatedSuspensionReason,
  );

  // 10. Verify updated_at timestamp reflects modification
  TestValidator.predicate(
    "updated_at timestamp changed after update",
    new Date(updatedSuspension.updated_at).getTime() >
      new Date(suspension.updated_at).getTime(),
  );

  // 11. Verify suspension's active status, duration, and end_date remain unchanged
  TestValidator.equals(
    "suspension duration remains unchanged",
    updatedSuspension.duration_days,
    originalDuration,
  );

  TestValidator.equals(
    "suspension active status remains unchanged",
    updatedSuspension.is_active,
    originalIsActive,
  );

  TestValidator.equals(
    "suspension end_date remains unchanged",
    updatedSuspension.end_date,
    originalEndDate,
  );

  TestValidator.equals(
    "suspension ID remains the same",
    updatedSuspension.id,
    suspension.id,
  );

  TestValidator.equals(
    "member_id remains unchanged",
    updatedSuspension.member_id,
    member.id,
  );

  TestValidator.equals(
    "start_date remains unchanged",
    updatedSuspension.start_date,
    suspension.start_date,
  );

  TestValidator.equals(
    "created_at remains unchanged",
    updatedSuspension.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "lifted_early status remains unchanged",
    updatedSuspension.lifted_early,
    suspension.lifted_early,
  );
}

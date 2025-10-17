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
 * Test the complete workflow of lifting a suspension early after a successful
 * appeal.
 *
 * This test validates the appeal approval workflow where moderators can restore
 * member privileges after reviewing successful appeals. The workflow includes:
 *
 * 1. Create administrator account for category creation permission
 * 2. Administrator creates a category for topic organization
 * 3. Create moderator account with admin appointment
 * 4. Create member account who will be suspended
 * 5. Member creates a discussion topic
 * 6. Moderator creates moderation action documenting the violation
 * 7. Moderator creates suspension based on the moderation action
 * 8. Moderator lifts suspension early after appeal approval
 * 9. Verify suspension is_active=false, lifted_at recorded, lifted_reason captured
 */
export async function test_api_suspension_early_lift_after_appeal_approval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Administrator creates category for topic creation
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
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
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account with admin appointment
  const moderatorBody = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 4: Create member account who will be suspended
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 5: Member creates discussion topic
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);

  // Step 6: Moderator creates moderation action documenting the violation
  const moderationActionBody = {
    moderator_id: moderator.id,
    administrator_id: null,
    target_member_id: member.id,
    related_report_id: null,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: "suspend_user" as const,
    reason: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 12,
    }),
    violation_category: "spam" as const,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Moderator creates suspension based on moderation action
  const suspensionBody = {
    member_id: member.id,
    suspension_reason: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
    duration_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >(),
  } satisfies IDiscussionBoardSuspension.ICreate;

  const suspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.create(
      connection,
      {
        body: suspensionBody,
      },
    );
  typia.assert(suspension);

  // Verify suspension was created with active status
  TestValidator.predicate(
    "suspension is initially active",
    suspension.is_active === true,
  );
  TestValidator.equals(
    "suspension member ID matches",
    suspension.member_id,
    member.id,
  );

  // Step 8: Moderator lifts suspension early after appeal approval
  const updateBody = {
    lifted_early: true,
    lifted_reason: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardSuspension.IUpdate;

  const updatedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSuspension);

  // Step 9: Verify suspension was lifted early with all required fields
  TestValidator.predicate(
    "suspension is no longer active",
    updatedSuspension.is_active === false,
  );
  TestValidator.predicate(
    "suspension was lifted early",
    updatedSuspension.lifted_early === true,
  );
  TestValidator.predicate(
    "lifted_at timestamp is recorded",
    updatedSuspension.lifted_at !== null &&
      updatedSuspension.lifted_at !== undefined,
  );
  TestValidator.predicate(
    "lifted_reason is captured",
    updatedSuspension.lifted_reason !== null &&
      updatedSuspension.lifted_reason !== undefined,
  );
  TestValidator.equals(
    "lifted_reason matches provided reason",
    updatedSuspension.lifted_reason,
    updateBody.lifted_reason,
  );
}

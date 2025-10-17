import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_suspension_administrator_early_lift_appeal_approval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for appeal processing
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create member account who will be suspended
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 3: Create category for topic organization
  const categoryData = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 4: Member creates a topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Administrator creates moderation action documenting violation
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
  const selectedViolation = RandomGenerator.pick(violationCategories);

  const moderationActionData = {
    administrator_id: admin.id,
    target_member_id: member.id,
    content_topic_id: topic.id,
    action_type: "suspend_user" as const,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    violation_category: selectedViolation,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 6: Administrator creates suspension based on moderation action
  const suspensionData = {
    member_id: member.id,
    suspension_reason: RandomGenerator.paragraph({ sentences: 4 }),
    duration_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >(),
  } satisfies IDiscussionBoardSuspension.ICreate;

  const suspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Validate initial suspension state
  TestValidator.equals(
    "suspension is initially active",
    suspension.is_active,
    true,
  );
  TestValidator.equals(
    "suspension not initially lifted early",
    suspension.lifted_early,
    false,
  );

  // Step 7: Administrator lifts suspension early after appeal approval
  const liftReason = RandomGenerator.paragraph({ sentences: 4 });
  const updateData = {
    lifted_early: true,
    lifted_reason: liftReason,
  } satisfies IDiscussionBoardSuspension.IUpdate;

  const updatedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: updateData,
      },
    );
  typia.assert(updatedSuspension);

  // Validate suspension was lifted properly
  TestValidator.equals(
    "suspension is marked inactive after lift",
    updatedSuspension.is_active,
    false,
  );
  TestValidator.equals(
    "suspension marked as lifted early",
    updatedSuspension.lifted_early,
    true,
  );
  TestValidator.equals(
    "lifted reason is recorded",
    updatedSuspension.lifted_reason,
    liftReason,
  );

  // Validate lifted_at timestamp is recorded
  TestValidator.predicate(
    "lifted_at timestamp is recorded",
    updatedSuspension.lifted_at !== null &&
      updatedSuspension.lifted_at !== undefined,
  );
}

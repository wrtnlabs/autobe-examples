import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_ban_detail_retrieval_complete_information(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create category for topic creation
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create topic as member (member created implicitly)
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  const memberId = topic.author.id;

  // Step 4: Create moderation action documenting violation
  const moderationActionData = {
    administrator_id: admin.id,
    target_member_id: memberId,
    content_topic_id: topic.id,
    action_type: "ban_user" as const,
    reason: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 20,
      sentenceMax: 30,
    }),
    violation_category: "spam" as const,
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

  // Step 5: Create permanent ban with comprehensive details
  const banReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 25,
    sentenceMax: 35,
    wordMin: 4,
    wordMax: 8,
  });

  const banData = {
    member_id: memberId,
    moderation_action_id: moderationAction.id,
    ban_reason: banReason,
    violation_summary: RandomGenerator.content({ paragraphs: 2 }),
    is_appealable: true,
    appeal_window_days: 30,
    ip_address_banned: `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}`,
    email_banned: typia.random<string & tags.Format<"email">>(),
  } satisfies IDiscussionBoardBan.ICreate;

  const createdBan: IDiscussionBoardBan =
    await api.functional.discussionBoard.administrator.bans.create(connection, {
      body: banData,
    });
  typia.assert(createdBan);

  // Step 6: Retrieve ban details by ID
  const retrievedBan: IDiscussionBoardBan =
    await api.functional.discussionBoard.administrator.bans.at(connection, {
      banId: createdBan.id,
    });
  typia.assert(retrievedBan);

  // Step 7: Validate all ban fields are correctly populated
  TestValidator.equals("ban ID matches", retrievedBan.id, createdBan.id);
  TestValidator.equals("member ID matches", retrievedBan.member_id, memberId);
  TestValidator.equals(
    "administrator ID matches",
    retrievedBan.administrator_id,
    admin.id,
  );
  TestValidator.equals(
    "moderation action ID matches",
    retrievedBan.moderation_action_id,
    moderationAction.id,
  );

  // Step 8: Verify ban reason meets minimum 100 character requirement
  TestValidator.predicate(
    "ban reason length >= 100",
    retrievedBan.ban_reason.length >= 100,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.ban_reason,
    banData.ban_reason,
  );

  // Step 9: Validate violation summary
  TestValidator.equals(
    "violation summary matches",
    retrievedBan.violation_summary,
    banData.violation_summary,
  );

  // Step 10: Verify appealability status and appeal window
  TestValidator.equals(
    "is appealable matches",
    retrievedBan.is_appealable,
    true,
  );
  TestValidator.equals(
    "appeal window days matches",
    retrievedBan.appeal_window_days,
    30,
  );

  // Step 11: Confirm banned contact information
  TestValidator.equals(
    "IP address banned matches",
    retrievedBan.ip_address_banned,
    banData.ip_address_banned,
  );
  TestValidator.equals(
    "email banned matches",
    retrievedBan.email_banned,
    banData.email_banned,
  );

  // Step 12: Verify reversal information is null for non-reversed bans
  TestValidator.equals("is reversed is false", retrievedBan.is_reversed, false);
  TestValidator.equals("reversed at is null", retrievedBan.reversed_at, null);
  TestValidator.equals(
    "reversal reason is null",
    retrievedBan.reversal_reason,
    null,
  );

  // Step 13: Confirm audit trail timestamps are present
  TestValidator.predicate(
    "created_at is valid",
    retrievedBan.created_at !== null && retrievedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedBan.updated_at !== null && retrievedBan.updated_at !== undefined,
  );
}

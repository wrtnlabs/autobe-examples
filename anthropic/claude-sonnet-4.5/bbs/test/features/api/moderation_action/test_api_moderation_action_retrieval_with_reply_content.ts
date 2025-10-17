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
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_moderation_action_retrieval_with_reply_content(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator to set up categories
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create a discussion category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: 1,
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

  // Step 3: Register and authenticate as member to create discussion content
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 4: Create a parent discussion topic
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

  // Step 5: Create a reply to the topic that will be reported
  const replyContent = RandomGenerator.content({ paragraphs: 1 });
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: replyContent,
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 6: Submit a content report flagging the reply
  const reportData = {
    reported_topic_id: null,
    reported_reply_id: reply.id,
    violation_category: "offensive_language",
    reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 7: Register and authenticate as moderator
  const moderatorCredentials = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderator);

  // Step 8: Create a moderation action targeting the reported reply
  const moderationActionData = {
    moderator_id: moderator.id,
    administrator_id: null,
    target_member_id: member.id,
    related_report_id: report.id,
    content_topic_id: null,
    content_reply_id: reply.id,
    action_type: "hide_content" as const,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    violation_category: "offensive_language" as const,
    content_snapshot: replyContent,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 9: Retrieve the moderation action details to verify reply-specific information
  const retrievedAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validate that moderation action correctly references the reply
  TestValidator.equals(
    "moderation action references the reply ID",
    retrievedAction.content_reply_id,
    reply.id,
  );

  // Validate that topic ID is not set (since we're moderating a reply, not a topic)
  TestValidator.equals(
    "moderation action topic ID should be null for reply moderation",
    retrievedAction.content_topic_id,
    null,
  );

  // Validate content snapshot preserves the reply text
  TestValidator.equals(
    "content snapshot preserves exact reply text",
    retrievedAction.content_snapshot,
    replyContent,
  );

  // Validate action references the correct target member
  TestValidator.equals(
    "moderation action targets the reply author",
    retrievedAction.target_member_id,
    member.id,
  );

  // Validate action references the related report
  TestValidator.equals(
    "moderation action references the related report",
    retrievedAction.related_report_id,
    report.id,
  );

  // Validate moderator attribution
  TestValidator.equals(
    "moderation action performed by moderator",
    retrievedAction.moderator_id,
    moderator.id,
  );

  // Validate action type
  TestValidator.equals(
    "moderation action type is hide_content",
    retrievedAction.action_type,
    "hide_content",
  );

  // Validate violation category
  TestValidator.equals(
    "violation category matches",
    retrievedAction.violation_category,
    "offensive_language",
  );
}

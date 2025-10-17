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
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete workflow where a moderator retrieves details of a specific
 * moderation action they performed.
 *
 * This test validates that moderators can access full moderation action records
 * including action type, reasoning, target user/content information, and
 * timestamps for accountability and consistency review.
 *
 * Workflow:
 *
 * 1. Register and authenticate as an administrator to create necessary categories
 * 2. Create a discussion category for organizing topics
 * 3. Register and authenticate as a member to create content that will be
 *    moderated
 * 4. Create a discussion topic that will be reported
 * 5. Submit a content report flagging the topic for guideline violations
 * 6. Register and authenticate as a moderator to handle the report
 * 7. Create a moderation action to address the reported content
 * 8. Retrieve the moderation action details to verify complete information is
 *    accessible
 */
export async function test_api_moderation_action_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCredentials,
  });
  typia.assert(admin);

  // Step 2: Create a discussion category
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

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Register and authenticate as a member
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // Step 4: Create a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 5: Submit a content report
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

  const reportData = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: selectedViolation,
    reporter_explanation: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 6: Register and authenticate as a moderator
  const moderatorCredentials = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCredentials,
  });
  typia.assert(moderator);

  // Step 7: Create a moderation action
  const actionTypes = [
    "hide_content",
    "delete_content",
    "issue_warning",
    "suspend_user",
    "ban_user",
    "restore_content",
    "dismiss_report",
  ] as const;
  const selectedAction = RandomGenerator.pick(actionTypes);

  const moderationActionData = {
    moderator_id: moderator.id,
    administrator_id: null,
    target_member_id: member.id,
    related_report_id: report.id,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: selectedAction,
    reason: RandomGenerator.paragraph({ sentences: 10 }),
    violation_category: selectedViolation,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 8: Retrieve the moderation action details
  const retrievedAction =
    await api.functional.discussionBoard.moderator.moderationActions.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validation: Verify all moderation action details
  TestValidator.equals(
    "moderation action ID matches",
    retrievedAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    retrievedAction.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "target member ID matches",
    retrievedAction.target_member_id,
    member.id,
  );
  TestValidator.equals(
    "related report ID matches",
    retrievedAction.related_report_id,
    report.id,
  );
  TestValidator.equals(
    "content topic ID matches",
    retrievedAction.content_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "action type matches",
    retrievedAction.action_type,
    selectedAction,
  );
  TestValidator.equals(
    "violation category matches",
    retrievedAction.violation_category,
    selectedViolation,
  );
  TestValidator.predicate(
    "reason is populated",
    retrievedAction.reason.length > 0,
  );
  TestValidator.equals(
    "content snapshot matches",
    retrievedAction.content_snapshot,
    topic.body,
  );
  TestValidator.equals(
    "action is not reversed",
    retrievedAction.is_reversed,
    false,
  );
  TestValidator.equals(
    "reversed_at is null",
    retrievedAction.reversed_at,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedAction.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedAction.updated_at !== null,
  );
}

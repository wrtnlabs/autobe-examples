import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test administrator's ability to create and retrieve moderation actions
 * directly.
 *
 * This test validates the complete workflow where an administrator creates a
 * moderation action directly (not as a moderator) and then retrieves it to
 * verify proper attribution and metadata.
 *
 * Workflow:
 *
 * 1. Register and authenticate as administrator
 * 2. Create a discussion category
 * 3. Register as member to create content
 * 4. Create a discussion topic
 * 5. Report the topic
 * 6. Re-authenticate as administrator
 * 7. Create moderation action as administrator
 * 8. Retrieve the moderation action
 *
 * Validation:
 *
 * - Administrator_id is populated, moderator_id is null
 * - Action details reflect administrator-level enforcement
 * - Retrieved action matches created action
 */
export async function test_api_moderation_action_administrator_direct_action_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(administrator);

  // Step 2: Create a discussion category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 3: Register as member to create content
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Report the topic
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

  const reportData = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: RandomGenerator.pick(violationCategories),
    reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Re-authenticate as administrator
  await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });

  // Step 7: Create moderation action as administrator
  const actionTypes = [
    "hide_content",
    "delete_content",
    "issue_warning",
    "suspend_user",
    "ban_user",
    "restore_content",
    "dismiss_report",
  ] as const;

  const moderationActionData = {
    moderator_id: null,
    administrator_id: administrator.id,
    target_member_id: member.id,
    related_report_id: report.id,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: RandomGenerator.pick(actionTypes),
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    violation_category: RandomGenerator.pick(violationCategories),
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const createdAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(createdAction);

  // Validate administrator attribution
  TestValidator.equals(
    "administrator_id should be populated",
    createdAction.administrator_id,
    administrator.id,
  );
  TestValidator.equals(
    "moderator_id should be null for administrator action",
    createdAction.moderator_id,
    null,
  );

  // Step 8: Retrieve the moderation action
  const retrievedAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validate retrieved action matches created action
  TestValidator.equals(
    "retrieved action ID matches created action",
    retrievedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "retrieved action administrator_id is correct",
    retrievedAction.administrator_id,
    administrator.id,
  );
  TestValidator.equals(
    "retrieved action moderator_id is null",
    retrievedAction.moderator_id,
    null,
  );
  TestValidator.equals(
    "retrieved action type matches",
    retrievedAction.action_type,
    createdAction.action_type,
  );
  TestValidator.equals(
    "retrieved action target member matches",
    retrievedAction.target_member_id,
    member.id,
  );
}

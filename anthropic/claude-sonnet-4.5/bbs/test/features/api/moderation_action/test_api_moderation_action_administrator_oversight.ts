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
 * Test administrator oversight of moderation actions for quality assurance and
 * appeals investigation.
 *
 * This test validates the complete moderation oversight workflow where
 * administrators can retrieve and review moderation actions performed by
 * moderators. The test ensures accountability, transparency, and proper audit
 * trails in the moderation system.
 *
 * Workflow:
 *
 * 1. Register and authenticate as administrator
 * 2. Create discussion category as administrator
 * 3. Register as member to create reportable content
 * 4. Create discussion topic as member
 * 5. Report the topic for guideline violations
 * 6. Register as moderator (appointed by administrator)
 * 7. Create moderation action as moderator
 * 8. Re-authenticate as administrator
 * 9. Retrieve moderation action details for oversight
 */
export async function test_api_moderation_action_administrator_oversight(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create discussion category as administrator
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
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

  // Step 3: Register as member to create reportable content
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 4: Create discussion topic as member
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Report the topic for guideline violations
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
    reporter_explanation: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Register as moderator appointed by administrator
  const moderatorCredentials = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderator);

  // Step 7: Create moderation action as moderator
  const actionTypes = [
    "hide_content",
    "delete_content",
    "issue_warning",
    "suspend_user",
    "ban_user",
    "restore_content",
    "dismiss_report",
  ] as const;

  const violationCategoriesForAction = [
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
    related_report_id: report.id,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: RandomGenerator.pick(actionTypes),
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    violation_category: RandomGenerator.pick(violationCategoriesForAction),
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const createdAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(createdAction);

  // Step 8: Re-authenticate as administrator for oversight
  await api.functional.auth.administrator.join(connection, {
    body: adminCredentials,
  });

  // Step 9: Retrieve moderation action details as administrator for oversight
  const retrievedAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validation: Verify administrator can access moderation action details
  TestValidator.equals(
    "retrieved action ID matches created action",
    retrievedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "moderator attribution is correct",
    retrievedAction.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "target member is correct",
    retrievedAction.target_member_id,
    member.id,
  );
  TestValidator.equals(
    "related report reference is preserved",
    retrievedAction.related_report_id,
    report.id,
  );
  TestValidator.equals(
    "content topic reference is preserved",
    retrievedAction.content_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "action type is preserved",
    retrievedAction.action_type,
    createdAction.action_type,
  );
  TestValidator.equals(
    "moderation reason is accessible",
    retrievedAction.reason,
    createdAction.reason,
  );
  TestValidator.equals(
    "violation category is preserved",
    retrievedAction.violation_category,
    createdAction.violation_category,
  );
  TestValidator.equals(
    "content snapshot is preserved for appeals",
    retrievedAction.content_snapshot,
    topic.body,
  );
  TestValidator.equals(
    "action is not reversed initially",
    retrievedAction.is_reversed,
    false,
  );
}

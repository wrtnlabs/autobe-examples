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

export async function test_api_administrator_moderation_action_restore_content(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
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

  // Step 2: Create moderator account
  const moderatorCredentials = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderator);

  // Step 3: Create member account
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 4: Administrator creates category (already authenticated from step 1)
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
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

  // Step 5: Member creates topic (switch to member authentication)
  connection.headers = {};
  connection.headers.Authorization = member.token.access;

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

  // Step 6: Member submits report
  const reportData = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: "spam",
    reporter_explanation: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 7: Moderator hides content (switch to moderator authentication)
  connection.headers = {};
  connection.headers.Authorization = moderator.token.access;

  const hideModerationData = {
    moderator_id: moderator.id,
    administrator_id: null,
    target_member_id: member.id,
    related_report_id: report.id,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: "hide_content" as const,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    violation_category: "spam" as const,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const hideModerationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: hideModerationData,
      },
    );
  typia.assert(hideModerationAction);

  // Step 8: Administrator restores content (switch to administrator authentication)
  connection.headers = {};
  connection.headers.Authorization = admin.token.access;

  const restoreModerationData = {
    moderator_id: null,
    administrator_id: admin.id,
    target_member_id: member.id,
    related_report_id: report.id,
    content_topic_id: topic.id,
    content_reply_id: null,
    action_type: "restore_content" as const,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    violation_category: null,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const restoreModerationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: restoreModerationData,
      },
    );
  typia.assert(restoreModerationAction);

  // Validations
  TestValidator.equals(
    "restoration action type is correct",
    restoreModerationAction.action_type,
    "restore_content",
  );

  TestValidator.equals(
    "restoration targets same member",
    restoreModerationAction.target_member_id,
    member.id,
  );

  TestValidator.equals(
    "restoration references same topic",
    restoreModerationAction.content_topic_id,
    topic.id,
  );

  TestValidator.equals(
    "restoration performed by administrator",
    restoreModerationAction.administrator_id,
    admin.id,
  );

  TestValidator.equals(
    "moderator_id is null for administrator action",
    restoreModerationAction.moderator_id,
    null,
  );

  TestValidator.predicate(
    "restoration reason is provided",
    restoreModerationAction.reason.length > 0,
  );

  TestValidator.equals(
    "content snapshot preserved",
    restoreModerationAction.content_snapshot,
    topic.body,
  );

  TestValidator.equals(
    "both actions reference same content",
    restoreModerationAction.content_topic_id,
    hideModerationAction.content_topic_id,
  );
}

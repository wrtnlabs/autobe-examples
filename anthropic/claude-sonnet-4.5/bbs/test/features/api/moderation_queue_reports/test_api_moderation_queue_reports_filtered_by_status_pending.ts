import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test moderation queue retrieval filtering by pending status.
 *
 * This test validates the core moderation workflow where moderators access
 * unassigned reports awaiting review. It ensures that filtering by 'pending'
 * status returns only pending reports with proper pagination and all necessary
 * information for moderator decision-making.
 *
 * Workflow:
 *
 * 1. Create administrator account and set up discussion categories
 * 2. Create moderator account for moderation queue access
 * 3. Create member accounts to generate reportable content
 * 4. Members create discussion topics and replies
 * 5. Members submit multiple content reports with different violation categories
 * 6. Moderator retrieves moderation queue filtered by 'pending' status
 * 7. Validate only pending reports are returned
 * 8. Verify pagination metadata and report details are correct
 */
export async function test_api_moderation_queue_reports_filtered_by_status_pending(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
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

  // Step 2: Create discussion category as administrator
  const categoryData = {
    name: "Economics",
    slug: "economics",
    description: "Discussion about economic topics",
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

  // Step 3: Create moderator account
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

  // Step 4: Create first member account
  const member1Data = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: member1Data,
    });
  typia.assert(member1);

  // Step 5: Create second member account
  const member2Data = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: member2Data,
    });
  typia.assert(member2);

  // Step 6: Member 1 creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 7: Member 2 creates a reply to the topic
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
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

  // Step 8: Member 2 reports the topic for hate_speech (critical severity)
  const reportTopic1Data = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: "hate_speech",
    reporter_explanation:
      "This topic contains hateful content targeting a specific group.",
  } satisfies IDiscussionBoardReport.ICreate;

  const reportTopic1: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportTopic1Data,
    });
  typia.assert(reportTopic1);

  // Step 9: Member 1 reports the reply for spam (low severity)
  const reportReply1Data = {
    reported_topic_id: null,
    reported_reply_id: reply.id,
    violation_category: "spam",
    reporter_explanation: "This reply is clearly spam advertising.",
  } satisfies IDiscussionBoardReport.ICreate;

  const reportReply1: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportReply1Data,
    });
  typia.assert(reportReply1);

  // Step 10: Member 2 creates another report for misinformation (medium severity)
  const reportTopic2Data = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: "misinformation",
    reporter_explanation:
      "This topic spreads false information about economic policies.",
  } satisfies IDiscussionBoardReport.ICreate;

  const reportTopic2: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportTopic2Data,
    });
  typia.assert(reportTopic2);

  // Step 11: Switch to moderator account and retrieve pending reports
  const queueRequest = {
    status: "pending",
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardReport.IRequest;

  const queueResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: queueRequest,
    });
  typia.assert(queueResult);

  // Step 12: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid page number",
    queueResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    queueResult.pagination.limit === 25,
  );

  TestValidator.predicate(
    "pagination should have at least 3 reports",
    queueResult.pagination.records >= 3,
  );

  // Step 13: Validate all reports have pending status
  TestValidator.predicate(
    "all reports should have pending status",
    queueResult.data.every((report) => report.status === "pending"),
  );

  // Step 14: Validate all pending reports have null assigned_moderator_id
  TestValidator.predicate(
    "pending reports should have null assigned_moderator_id",
    queueResult.data.every(
      (report) =>
        report.assigned_moderator_id === null ||
        report.assigned_moderator_id === undefined,
    ),
  );

  // Step 15: Validate each report has required fields
  for (const report of queueResult.data) {
    TestValidator.predicate(
      "report should have valid ID",
      typeof report.id === "string" && report.id.length > 0,
    );

    TestValidator.predicate(
      "report should have violation_category",
      typeof report.violation_category === "string" &&
        report.violation_category.length > 0,
    );

    TestValidator.predicate(
      "report should have severity_level",
      typeof report.severity_level === "string" &&
        report.severity_level.length > 0,
    );

    TestValidator.predicate(
      "report should have reporter_member_id",
      typeof report.reporter_member_id === "string" &&
        report.reporter_member_id.length > 0,
    );

    TestValidator.predicate(
      "report should have created_at timestamp",
      typeof report.created_at === "string" && report.created_at.length > 0,
    );

    TestValidator.predicate(
      "report should have either reported_topic_id or reported_reply_id",
      (report.reported_topic_id !== null &&
        report.reported_topic_id !== undefined) ||
        (report.reported_reply_id !== null &&
          report.reported_reply_id !== undefined),
    );
  }

  // Step 16: Validate that our submitted reports are in the queue
  const reportIds = queueResult.data.map((r) => r.id);
  TestValidator.predicate(
    "queue should contain the hate_speech report",
    reportIds.includes(reportTopic1.id),
  );

  TestValidator.predicate(
    "queue should contain the spam report",
    reportIds.includes(reportReply1.id),
  );

  TestValidator.predicate(
    "queue should contain the misinformation report",
    reportIds.includes(reportTopic2.id),
  );
}

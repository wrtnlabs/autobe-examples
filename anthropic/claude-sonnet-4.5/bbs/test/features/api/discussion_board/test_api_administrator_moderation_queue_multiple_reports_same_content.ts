import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test administrator moderation queue handling of multiple reports on the same
 * content.
 *
 * This test validates the system's ability to track multiple reports on the
 * same discussion topic and present them in the moderation queue for
 * administrative review. Due to API constraints (no login endpoint for
 * switching between users), this test creates multiple reports from a single
 * member account to demonstrate the report aggregation functionality.
 *
 * Workflow:
 *
 * 1. Create administrator account for moderation queue access
 * 2. Create member account (reporter)
 * 3. Set up discussion category infrastructure
 * 4. Create a single topic that will receive multiple reports
 * 5. Submit multiple reports on the same topic from the member
 * 6. Retrieve moderation queue as administrator
 * 7. Verify all reports are tracked and visible
 * 8. Validate report presence in queue
 * 9. Confirm reports reference the same topic
 */
export async function test_api_administrator_moderation_queue_multiple_reports_same_content(
  connection: api.IConnection,
) {
  // 1. Create administrator account
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

  // 2. Create member account (reporter)
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

  // Switch back to admin to create category
  const adminReauth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(adminReauth);

  // 3. Set up discussion category
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Switch to member to create topic
  const memberReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberReauth);

  // 4. Create a topic that will receive multiple reports
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
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

  // 5. Submit multiple reports on the same topic
  const reportCount = 3;
  const violationCategories = [
    "hate_speech",
    "misinformation",
    "offensive_language",
  ];

  const reports: IDiscussionBoardReport[] = await ArrayUtil.asyncRepeat(
    reportCount,
    async (index) => {
      const reportData = {
        reported_topic_id: topic.id,
        reported_reply_id: null,
        violation_category: violationCategories[index],
        reporter_explanation: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardReport.ICreate;

      const report: IDiscussionBoardReport =
        await api.functional.discussionBoard.member.reports.create(connection, {
          body: reportData,
        });
      typia.assert(report);
      return report;
    },
  );

  // Switch back to administrator
  const adminFinal: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(adminFinal);

  // 6. Retrieve moderation queue
  const queueRequest = {
    status: "pending",
    violation_category: null,
    severity_level: null,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: "priority",
    sort_order: "desc",
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReport.IRequest;

  const moderationQueue: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: queueRequest,
      },
    );
  typia.assert(moderationQueue);

  // 7. Verify all reports are visible in the queue
  const reportsOnTopic = moderationQueue.data.filter(
    (r) => r.reported_topic_id === topic.id,
  );

  TestValidator.equals(
    "all reports on same topic should be visible",
    reportsOnTopic.length,
    reportCount,
  );

  // 8. Validate each report is tracked in queue
  const reportIds = reports.map((r) => r.id);
  const queueReportIds = reportsOnTopic.map((r) => r.id);

  TestValidator.predicate(
    "all created reports should appear in queue",
    reportIds.every((id) => queueReportIds.includes(id)),
  );

  // 9. Verify all reports reference the same topic
  TestValidator.predicate(
    "all reports should reference the same topic",
    reportsOnTopic.every((r) => r.reported_topic_id === topic.id),
  );

  // Verify severity levels are properly assigned
  reportsOnTopic.forEach((report) => {
    TestValidator.predicate(
      "severity level should be assigned",
      report.severity_level !== null && report.severity_level !== undefined,
    );
  });

  // Verify all reports are in pending status
  TestValidator.predicate(
    "all reports should be in pending status",
    reportsOnTopic.every((r) => r.status === "pending"),
  );
}

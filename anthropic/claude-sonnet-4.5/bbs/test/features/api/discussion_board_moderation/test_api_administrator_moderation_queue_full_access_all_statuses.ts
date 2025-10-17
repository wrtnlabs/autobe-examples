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

export async function test_api_administrator_moderation_queue_full_access_all_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create moderator account
  const modBody = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: modBody,
    });
  typia.assert(moderator);

  // Step 3: Create multiple member accounts
  const members = await ArrayUtil.asyncRepeat(3, async () => {
    const memberBody = {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate;

    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: memberBody,
      });
    typia.assert(member);
    return member;
  });

  // Step 4: Create discussion categories
  const categories = await ArrayUtil.asyncRepeat(2, async (index) => {
    const categoryBody = {
      name: `Category ${RandomGenerator.alphaNumeric(6)}`,
      slug: `category-${RandomGenerator.alphaNumeric(6)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      display_order: index,
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
    return category;
  });

  // Step 5: Create topics across categories
  const topics: IDiscussionBoardTopic[] = [];
  for (let i = 0; i < 3; i++) {
    const topicBody = {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      category_id: categories[i % categories.length].id,
      tag_ids: null,
    } satisfies IDiscussionBoardTopic.ICreate;

    const topic: IDiscussionBoardTopic =
      await api.functional.discussionBoard.member.topics.create(connection, {
        body: topicBody,
      });
    typia.assert(topic);
    topics.push(topic);
  }

  // Step 6: Create replies to topics
  const replies: IDiscussionBoardReply[] = [];
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    const replyBody = {
      discussion_board_topic_id: topic.id,
      parent_reply_id: null,
      content: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies IDiscussionBoardReply.ICreate;

    const reply: IDiscussionBoardReply =
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: replyBody,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Step 7: Submit reports for topics and replies
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
  ] as const;

  const reports: IDiscussionBoardReport[] = [];

  // Report some topics
  for (let i = 0; i < 2; i++) {
    const reportBody = {
      reported_topic_id: topics[i].id,
      reported_reply_id: null,
      violation_category: RandomGenerator.pick(violationCategories),
      reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: reportBody,
      });
    typia.assert(report);
    reports.push(report);
  }

  // Report some replies
  for (let i = 0; i < 2; i++) {
    const reportBody = {
      reported_topic_id: null,
      reported_reply_id: replies[i].id,
      violation_category: RandomGenerator.pick(violationCategories),
      reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: reportBody,
      });
    typia.assert(report);
    reports.push(report);
  }

  // Step 8: As administrator, retrieve complete moderation queue without status filtering
  const adminQueueRequest = {
    status: null,
    violation_category: null,
    severity_level: null,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReport.IRequest;

  const adminQueue: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: adminQueueRequest,
      },
    );
  typia.assert(adminQueue);

  // Step 9: Verify administrator sees all submitted reports
  TestValidator.predicate(
    "administrator should see all submitted reports",
    adminQueue.data.length >= reports.length,
  );

  // Step 10: Validate all submitted reports are present in admin queue
  const allReportIds = reports.map((r) => r.id);
  const retrievedReportIds = adminQueue.data.map((r) => r.id);

  for (const reportId of allReportIds) {
    TestValidator.predicate(
      "submitted report should be present in admin queue",
      retrievedReportIds.includes(reportId),
    );
  }

  // Step 11: Test filtering by violation category
  const testCategory = reports[0].violation_category;
  const categoryFilterRequest = {
    status: null,
    violation_category: testCategory,
    severity_level: null,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReport.IRequest;

  const categoryFilteredQueue: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: categoryFilterRequest,
      },
    );
  typia.assert(categoryFilteredQueue);

  for (const report of categoryFilteredQueue.data) {
    TestValidator.equals(
      "filtered report violation category should match",
      report.violation_category,
      testCategory,
    );
  }

  // Step 12: Test filtering by severity level
  const testSeverity = adminQueue.data[0].severity_level;
  const severityFilterRequest = {
    status: null,
    violation_category: null,
    severity_level: testSeverity,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReport.IRequest;

  const severityFilteredQueue: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: severityFilterRequest,
      },
    );
  typia.assert(severityFilteredQueue);

  for (const report of severityFilteredQueue.data) {
    TestValidator.equals(
      "filtered report severity level should match",
      report.severity_level,
      testSeverity,
    );
  }

  // Step 13: Test pagination functionality
  const paginatedRequest = {
    status: null,
    violation_category: null,
    severity_level: null,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardReport.IRequest;

  const firstPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: paginatedRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.predicate(
    "pagination should respect limit",
    firstPage.data.length <= 2,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );

  // Step 14: Test filtering by status values
  const statusFilterRequest = {
    status: "pending",
    violation_category: null,
    severity_level: null,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReport.IRequest;

  const statusFilteredQueue: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFilteredQueue);

  for (const report of statusFilteredQueue.data) {
    TestValidator.equals(
      "filtered report status should match pending",
      report.status,
      "pending",
    );
  }
}

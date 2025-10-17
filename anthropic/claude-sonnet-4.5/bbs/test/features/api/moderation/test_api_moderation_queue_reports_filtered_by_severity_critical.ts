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
 * Test moderation queue retrieval with critical severity filtering.
 *
 * Validates that moderators can filter the moderation queue by critical
 * severity level to prioritize the most serious violations (hate speech,
 * threats, doxxing) requiring immediate attention within 1-hour response time.
 *
 * Workflow:
 *
 * 1. Create administrator account for category setup
 * 2. Create moderator account for queue access
 * 3. Create member accounts for content and reports
 * 4. Set up discussion categories
 * 5. Create topics with violations
 * 6. Create replies with violations
 * 7. Submit reports with varying severities
 * 8. Filter moderation queue by critical severity as moderator
 * 9. Verify only critical reports returned
 * 10. Validate critical violation categorization
 */
export async function test_api_moderation_queue_reports_filtered_by_severity_critical(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create member accounts (storing credentials for later use)
  const memberAccounts = await ArrayUtil.asyncRepeat(5, async () => {
    const password = RandomGenerator.alphaNumeric(12);
    const email = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: email,
        password: password,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return { member, email, password };
  });

  // Step 4: Set up discussion categories as administrator
  const categories = await ArrayUtil.asyncRepeat(2, async (index) => {
    const category =
      await api.functional.discussionBoard.administrator.categories.create(
        connection,
        {
          body: {
            name: index === 0 ? "Economics" : "Politics",
            slug: index === 0 ? "economics" : "politics",
            description:
              index === 0 ? "Economic discussions" : "Political discussions",
            parent_category_id: null,
            display_order: index,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 5: Create topics with violations (using first member's context)
  const topicsAndReplies = await ArrayUtil.asyncRepeat(4, async (index) => {
    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          category_id: categories[index % categories.length].id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);

    // Step 6: Create replies
    const reply =
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: {
            discussion_board_topic_id: topic.id,
            parent_reply_id: null,
            content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 15,
            }),
          } satisfies IDiscussionBoardReply.ICreate,
        },
      );
    typia.assert(reply);

    return { topic, reply };
  });

  // Step 7: Submit reports with varying severity levels
  const violationCategories = [
    "hate_speech",
    "threats",
    "doxxing",
    "personal_attack",
    "misinformation",
    "offensive_language",
    "spam",
    "off_topic",
  ];

  const criticalViolations = ["hate_speech", "threats", "doxxing"];
  const reports = await ArrayUtil.asyncRepeat(8, async (index) => {
    const targetContent = topicsAndReplies[index % topicsAndReplies.length];
    const isReportingTopic = index % 2 === 0;
    const violationCategory =
      violationCategories[index % violationCategories.length];

    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reported_topic_id: isReportingTopic ? targetContent.topic.id : null,
          reported_reply_id: isReportingTopic ? null : targetContent.reply.id,
          violation_category: violationCategory,
          reporter_explanation: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    return { report, violationCategory };
  });

  // Step 8: Filter moderation queue by critical severity (as moderator)
  const criticalReportsPage =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        severity_level: "critical",
        status: null,
        violation_category: null,
        assigned_moderator_id: null,
        from_date: null,
        to_date: null,
        sort_by: null,
        sort_order: null,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(criticalReportsPage);

  // Step 9: Verify only critical severity reports returned
  TestValidator.predicate(
    "critical reports page should have results",
    criticalReportsPage.data.length > 0,
  );

  for (const reportSummary of criticalReportsPage.data) {
    TestValidator.equals(
      "all reports should have critical severity",
      reportSummary.severity_level,
      "critical",
    );
  }

  // Step 10: Validate critical violation categorization
  const returnedViolationCategories = criticalReportsPage.data.map(
    (r) => r.violation_category,
  );

  for (const category of returnedViolationCategories) {
    TestValidator.predicate(
      "violation category should be critical type",
      criticalViolations.includes(category),
    );
  }

  // Verify correct number of critical reports
  const expectedCriticalCount = reports.filter((r) =>
    criticalViolations.includes(r.violationCategory),
  ).length;

  TestValidator.predicate(
    "critical reports count should match submitted critical violations",
    criticalReportsPage.data.length >= expectedCriticalCount,
  );

  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    criticalReportsPage.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination records should match or exceed data length",
    criticalReportsPage.pagination.records >= criticalReportsPage.data.length,
  );

  // Verify report metadata structure
  for (const reportSummary of criticalReportsPage.data) {
    TestValidator.predicate(
      "report should have valid status",
      ["pending", "under_review", "resolved", "dismissed"].includes(
        reportSummary.status,
      ),
    );

    TestValidator.predicate(
      "report should reference either topic or reply",
      reportSummary.reported_topic_id !== null ||
        reportSummary.reported_reply_id !== null,
    );
  }
}

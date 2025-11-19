import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test filtering member reports by date range using created_at_from and
 * created_at_to parameters.
 *
 * This test validates the date range filtering functionality for member report
 * history. It creates multiple reports and uses date range filters to validate
 * that only reports within the specified time window are returned.
 *
 * Since report creation timestamps are set automatically by the server, this
 * test:
 *
 * 1. Captures the timestamp before creating the first batch of reports
 * 2. Creates an initial set of reports
 * 3. Captures a boundary timestamp
 * 4. Creates a second batch of reports
 * 5. Uses date range filtering to retrieve only the first batch
 * 6. Validates that the second batch is excluded by the date filter
 *
 * This approach tests the date filtering mechanism while working within the API
 * constraints.
 */
export async function test_api_member_report_history_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for querying reports
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/moderator/join",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const categoryData = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description: "Category for economic topics",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for submitting reports
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "member123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/member/join",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create articles for reporting
  const articles = await ArrayUtil.asyncRepeat(6, async (index) => {
    const articleData = {
      title: `Test Article ${index + 1} - ${RandomGenerator.name(3)}`,
      body: RandomGenerator.content({ paragraphs: 3 }),
      discussion_board_article_category_id: category.id,
      status: "published" as const,
    } satisfies IDiscussionBoardArticle.ICreate;

    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: articleData,
      },
    );
    typia.assert(article);
    return article;
  });

  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  // Step 5: Capture start time and create first batch of reports
  const batchStartTime = new Date();

  const firstBatchReports = await ArrayUtil.asyncRepeat(3, async (index) => {
    const reportData = {
      discussion_board_article_id: articles[index].id,
      report_category: RandomGenerator.pick(reportCategories),
      report_details: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardContentReport.ICreate;

    const report =
      await api.functional.discussionBoard.member.articles.reports.create(
        connection,
        {
          articleId: articles[index].id,
          body: reportData,
        },
      );
    typia.assert(report);
    return report;
  });

  // Step 6: Add small delay and capture boundary time
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const boundaryTime = new Date();

  // Step 7: Create second batch of reports after the boundary
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const secondBatchReports = await ArrayUtil.asyncRepeat(3, async (index) => {
    const reportData = {
      discussion_board_article_id: articles[index + 3].id,
      report_category: RandomGenerator.pick(reportCategories),
      report_details: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardContentReport.ICreate;

    const report =
      await api.functional.discussionBoard.member.articles.reports.create(
        connection,
        {
          articleId: articles[index + 3].id,
          body: reportData,
        },
      );
    typia.assert(report);
    return report;
  });

  // Step 8: Switch to moderator to query reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 9: Query with date range filter to get only first batch
  const filteredReportsPage =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          created_at_from: batchStartTime.toISOString(),
          created_at_to: boundaryTime.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(filteredReportsPage);

  // Step 10: Validate all returned reports are within the date range
  const filterStartTime = batchStartTime.getTime();
  const filterEndTime = boundaryTime.getTime();

  for (const report of filteredReportsPage.data) {
    const reportCreatedAt = new Date(report.created_at).getTime();

    TestValidator.predicate(
      "report created_at should be >= filter start date",
      reportCreatedAt >= filterStartTime,
    );

    TestValidator.predicate(
      "report created_at should be <= filter end date",
      reportCreatedAt <= filterEndTime,
    );
  }

  // Step 11: Validate that filtered results contain first batch reports
  TestValidator.predicate(
    "filtered results should contain first batch reports",
    filteredReportsPage.data.length >= 3,
  );

  // Step 12: Query all reports to verify second batch exists but was excluded
  const allReportsPage =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(allReportsPage);

  // Step 13: Validate total reports exceed filtered reports
  TestValidator.predicate(
    "total reports should exceed filtered reports",
    allReportsPage.data.length > filteredReportsPage.data.length,
  );

  // Step 14: Verify second batch reports are excluded from filtered results
  const secondBatchIds = secondBatchReports.map((r) => r.id);
  const filteredIds = filteredReportsPage.data.map((r) => r.id);

  for (const secondBatchId of secondBatchIds) {
    TestValidator.predicate(
      "second batch report should not be in filtered results",
      !filteredIds.includes(secondBatchId),
    );
  }

  // Step 15: Validate pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    filteredReportsPage.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination records should match data length",
    filteredReportsPage.pagination.records >= filteredReportsPage.data.length,
  );
}

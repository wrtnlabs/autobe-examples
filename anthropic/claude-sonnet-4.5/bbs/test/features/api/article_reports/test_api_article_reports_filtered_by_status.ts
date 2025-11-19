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
 * Test moderator retrieval of article reports with status filtering to focus on
 * actionable items.
 *
 * This scenario validates that moderators can filter reports by status
 * (pending, reviewed_no_action, reviewed_edited, reviewed_removed) to
 * efficiently manage their moderation workflow. The test creates member and
 * moderator accounts, establishes a category, creates an article, submits
 * multiple reports, then retrieves reports filtered by specific status values.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create and authenticate member account
 * 3. Create article category (as moderator)
 * 4. Create article (as member)
 * 5. Submit multiple content reports (as member)
 * 6. Retrieve reports filtered by status (as moderator)
 * 7. Validate filtering returns only matching status reports
 */
export async function test_api_article_reports_filtered_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Step 3: Switch back to moderator and create category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discussions about political topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member and create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit multiple content reports with different categories
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
  ] as const;
  const createdReports = await ArrayUtil.asyncMap(
    reportCategories,
    async (reportCategory) => {
      const report =
        await api.functional.discussionBoard.member.contentReports.create(
          connection,
          {
            body: {
              discussion_board_article_id: article.id,
              report_category: reportCategory,
              report_details: `This article contains ${reportCategory.toLowerCase()} content`,
            } satisfies IDiscussionBoardContentReport.ICreate,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Switch to moderator and retrieve reports filtered by status
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test filtering by "pending" status (all newly created reports should be pending)
  const pendingReportsPage =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingReportsPage);

  // Step 7: Validate filtering results
  TestValidator.equals(
    "all reports should be pending status",
    pendingReportsPage.data.length,
    createdReports.length,
  );

  TestValidator.predicate(
    "all returned reports have pending status",
    pendingReportsPage.data.every((report) => report.status === "pending"),
  );

  // Verify all created report IDs are present
  const returnedReportIds = pendingReportsPage.data.map((r) => r.id);
  const createdReportIds = createdReports.map((r) => r.id);
  TestValidator.predicate(
    "all created reports are returned in filtered results",
    createdReportIds.every((id) => returnedReportIds.includes(id)),
  );

  // Test filtering by other status (should return empty results)
  const reviewedReportsPage =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          status: "reviewed_no_action",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reviewedReportsPage);

  TestValidator.equals(
    "no reviewed reports should exist",
    reviewedReportsPage.data.length,
    0,
  );
}

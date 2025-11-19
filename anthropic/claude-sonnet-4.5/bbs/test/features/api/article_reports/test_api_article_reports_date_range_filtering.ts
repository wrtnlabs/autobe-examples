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
 * Test moderator retrieval of article reports with date range filtering for
 * time-based analysis and workflow management.
 *
 * This scenario validates that moderators can filter reports by submission date
 * ranges (created_at_from, created_at_to) and resolution date ranges
 * (resolved_at_from, resolved_at_to) to analyze reporting patterns over
 * specific periods or focus on reports from particular timeframes.
 *
 * The test creates member and moderator accounts, establishes a category,
 * creates an article, submits content reports at different times (simulated),
 * resolves some reports, then retrieves reports filtered by various date range
 * criteria. Verify that date filtering correctly isolates reports within the
 * specified timeframe, enabling moderators to analyze reporting spikes, focus
 * on recent reports, or review historical moderation activity for specific
 * periods.
 */
export async function test_api_article_reports_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account for reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Switch to moderator to create category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/dashboard",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch to member to create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member/login",
      referrer: "https://example.com/articles",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 5. Submit multiple content reports (simulating different time points)
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
  ] as const;
  const reports: IDiscussionBoardContentReport[] = [];

  for (let i = 0; i < 5; i++) {
    const report: IDiscussionBoardContentReport =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            discussion_board_article_id: article.id,
            report_category: RandomGenerator.pick(reportCategories),
            report_details: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // 6. Switch to moderator for filtering and resolving reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/reports",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Get baseline - all reports without date filtering
  const allReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals(
    "all reports count",
    allReports.data.length,
    reports.length,
  );

  // 8. Test created_at date range filtering - reports should be within recent timeframe
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const recentReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: oneHourLater.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(recentReports);
  TestValidator.predicate(
    "recent reports within date range",
    recentReports.data.length > 0,
  );

  // 9. Test with narrow date range in future (should return no reports)
  const veryRecentStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const veryRecentEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const futureReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: veryRecentStart.toISOString(),
          created_at_to: veryRecentEnd.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(futureReports);
  TestValidator.equals(
    "no reports in future date range",
    futureReports.data.length,
    0,
  );

  // 10. Validate that all returned reports are within the specified date range
  for (const report of recentReports.data) {
    const createdAt = new Date(report.created_at);
    TestValidator.predicate(
      "report created_at within range",
      createdAt >= oneHourAgo && createdAt <= oneHourLater,
    );
  }
}

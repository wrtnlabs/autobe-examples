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
 * Test the complete workflow of a moderator retrieving all content reports
 * submitted for a specific article.
 *
 * This test validates that moderators can view comprehensive report information
 * to understand community concerns about particular content. The test creates a
 * member account, establishes a category, creates an article, submits multiple
 * content reports from the same or different members against the article, then
 * authenticates as a moderator and retrieves the paginated list of reports for
 * that specific article.
 *
 * Verification includes:
 *
 * 1. All report details are present (reporter information, violation categories,
 *    explanations, timestamps, status)
 * 2. Pagination works correctly
 * 3. Moderators can see all reports to make informed moderation decisions
 */
export async function test_api_article_reports_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article creation and report submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Login as moderator to create category (moderator privilege required)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 4: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and theories",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member account to create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 6: Create article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 7: Submit multiple content reports
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
  ] as const;
  const submittedReports: IDiscussionBoardContentReport[] = [];

  for (const reportCategory of reportCategories) {
    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            discussion_board_article_id: article.id,
            report_category: reportCategory,
            report_details: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    submittedReports.push(report);
  }

  // Step 8: Switch to moderator account to retrieve reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 9: Retrieve reports for the specific article
  const reportsPage =
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
  typia.assert(reportsPage);

  // Step 10: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    reportsPage.pagination.current === 1 &&
      reportsPage.pagination.limit === 20 &&
      reportsPage.pagination.records >= reportCategories.length,
  );

  // Step 11: Validate all submitted reports are present
  TestValidator.predicate(
    "number of reports should include all submitted reports",
    reportsPage.data.length >= reportCategories.length,
  );

  // Step 12: Validate each submitted report has complete information
  for (const submittedReport of submittedReports) {
    const foundReport = reportsPage.data.find(
      (r) => r.id === submittedReport.id,
    );
    typia.assertGuard(foundReport!);

    TestValidator.equals(
      "report should be associated with correct article",
      foundReport.discussion_board_article_id,
      article.id,
    );

    TestValidator.equals(
      "report should be submitted by member",
      foundReport.discussion_board_member_id,
      member.id,
    );

    TestValidator.predicate(
      "report category should be valid",
      [
        "Spam",
        "Offensive Content",
        "Misinformation",
        "Off-Topic",
        "Other",
      ].includes(foundReport.report_category),
    );

    TestValidator.equals(
      "report should have pending status",
      foundReport.status,
      "pending",
    );

    TestValidator.predicate(
      "report should have creation timestamp",
      foundReport.created_at !== null && foundReport.created_at !== undefined,
    );
  }

  // Step 13: Test pagination with different parameters
  const filteredPage =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 2,
          status: "pending",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered page should respect limit",
    filteredPage.data.length <= 2,
  );

  TestValidator.predicate(
    "filtered reports should all have pending status",
    filteredPage.data.every((r) => r.status === "pending"),
  );
}

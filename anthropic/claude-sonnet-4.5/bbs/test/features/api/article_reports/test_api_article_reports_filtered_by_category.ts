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
 * Test moderator retrieval of article reports filtered by violation category.
 *
 * This test validates that moderators can filter reports by category (Spam,
 * Offensive Content, Misinformation, Off-Topic, Other) to create specialized
 * review workflows. The test creates member and moderator accounts, establishes
 * an article category, creates an article, submits multiple reports with
 * different violation categories, then retrieves reports filtered by specific
 * categories.
 *
 * Verify that category filtering correctly isolates reports of specific
 * violation types, enabling moderators to handle different types of violations
 * with appropriate expertise and priority levels.
 */
export async function test_api_article_reports_filtered_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Switch to moderator and create article category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and markets",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member and create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "https://example.com/member/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit multiple reports with different violation categories
  const spamReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Spam",
          report_details:
            "This article contains spam content promoting products",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(spamReport);

  const misinfoReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Misinformation",
          report_details:
            "This article contains factually incorrect economic data",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(misinfoReport);

  const offensiveReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Offensive Content",
          report_details:
            "This article contains offensive language targeting groups",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(offensiveReport);

  // Step 6: Switch back to moderator for filtering reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Filter reports by Spam category
  const spamReports =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          report_category: "Spam",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(spamReports);

  TestValidator.equals(
    "spam reports count should be 1",
    spamReports.data.length,
    1,
  );
  TestValidator.equals(
    "spam report category matches",
    spamReports.data[0].report_category,
    "Spam",
  );
  TestValidator.equals(
    "spam report ID matches",
    spamReports.data[0].id,
    spamReport.id,
  );

  // Step 8: Filter reports by Misinformation category
  const misinfoReports =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          report_category: "Misinformation",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(misinfoReports);

  TestValidator.equals(
    "misinformation reports count should be 1",
    misinfoReports.data.length,
    1,
  );
  TestValidator.equals(
    "misinformation report category matches",
    misinfoReports.data[0].report_category,
    "Misinformation",
  );
  TestValidator.equals(
    "misinformation report ID matches",
    misinfoReports.data[0].id,
    misinfoReport.id,
  );

  // Step 9: Filter reports by Offensive Content category
  const offensiveReports =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          report_category: "Offensive Content",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(offensiveReports);

  TestValidator.equals(
    "offensive content reports count should be 1",
    offensiveReports.data.length,
    1,
  );
  TestValidator.equals(
    "offensive content report category matches",
    offensiveReports.data[0].report_category,
    "Offensive Content",
  );
  TestValidator.equals(
    "offensive content report ID matches",
    offensiveReports.data[0].id,
    offensiveReport.id,
  );

  // Step 10: Retrieve all reports without category filter to verify total count
  const allReports =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(allReports);

  TestValidator.equals(
    "total reports count should be 3",
    allReports.data.length,
    3,
  );
}

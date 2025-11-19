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
 * Test moderator retrieval of article reports from multiple different members
 * to understand community consensus about policy violations.
 *
 * This scenario validates that moderators can see all independent reports
 * submitted by different members for the same article, helping identify content
 * that multiple community members find problematic. The test creates multiple
 * member accounts, establishes a moderator account and category, creates a
 * single article, submits content reports from different members (each with
 * potentially different violation categories and explanations), then retrieves
 * all reports for the article as a moderator.
 *
 * Workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category
 * 3. Create multiple member accounts (3 reporters)
 * 4. Create a single article that will receive multiple reports
 * 5. Submit independent reports from each member with different violation
 *    categories
 * 6. Switch to moderator account and retrieve all reports for the article
 * 7. Verify all reports from different reporters are included with correct
 *    attribution
 */
export async function test_api_article_reports_multiple_reporters_consensus(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorPassword = typia.random<string>();
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: moderatorPassword,
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const categoryData = {
    name: "General Discussion",
    slug: "general-discussion",
    description: "General discussion topics",
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

  // Step 3: Create multiple member accounts (3 reporters)
  const reporterCount = 3;
  const memberCredentials: Array<{ email: string; password: string }> = [];

  for (let i = 0; i < reporterCount; i++) {
    const password = typia.random<string>();
    const memberData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);
    memberCredentials.push({ email: memberData.email, password });
  }

  // Step 4: Create a single article (using first member)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[0].email,
      password: memberCredentials[0].password,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
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

  // Step 5: Submit reports from each member with different violation categories
  const violationCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
  ] as const;
  const submittedReports: IDiscussionBoardContentReport[] = [];

  for (let i = 0; i < memberCredentials.length; i++) {
    const credentials = memberCredentials[i];

    // Login as this member
    await api.functional.auth.member.login(connection, {
      body: {
        email: credentials.email,
        password: credentials.password,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });

    // Submit report with different violation category
    const reportData = {
      discussion_board_article_id: article.id,
      report_category: violationCategories[i],
      report_details: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardContentReport.ICreate;

    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: reportData,
        },
      );
    typia.assert(report);
    submittedReports.push(report);
  }

  // Step 6: Switch to moderator account and retrieve all reports for the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

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

  // Step 7: Verify all reports from different reporters are included
  TestValidator.equals(
    "all reports should be retrieved",
    reportsPage.data.length,
    reporterCount,
  );

  TestValidator.equals(
    "pagination total records should match report count",
    reportsPage.pagination.records,
    reporterCount,
  );

  // Verify each submitted report is present in the response
  for (const submittedReport of submittedReports) {
    const foundReport = reportsPage.data.find(
      (r) => r.id === submittedReport.id,
    );
    if (!foundReport) {
      throw new Error(`Report ${submittedReport.id} not found in response`);
    }
    typia.assert(foundReport);

    TestValidator.equals(
      "report article ID matches",
      foundReport.discussion_board_article_id,
      article.id,
    );

    TestValidator.predicate(
      "report category is one of the violation categories",
      violationCategories.includes(foundReport.report_category as any),
    );

    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
  }

  // Verify all different members are represented as reporters
  const uniqueReporterIds = new Set(
    reportsPage.data.map((r) => r.discussion_board_member_id),
  );
  TestValidator.equals(
    "all different members should be represented as reporters",
    uniqueReporterIds.size,
    reporterCount,
  );
}

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
 * Test retrieving the complete reporting history for a specific member.
 *
 * This test validates the moderator's ability to query all content reports
 * submitted by a particular member. It creates a comprehensive test scenario
 * with multiple reports across different article categories and violation
 * types, then verifies that the pagination API correctly returns all reports
 * associated with the target member.
 *
 * Test Flow:
 *
 * 1. Create moderator account for accessing report history
 * 2. Create article categories for test articles
 * 3. Create member account who will submit reports
 * 4. Create multiple articles to be reported
 * 5. Create multiple reports with different violation categories
 * 6. Switch to moderator account
 * 7. Retrieve member's complete report history with pagination
 * 8. Validate response structure, pagination, and report details
 */
export async function test_api_member_report_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article categories
  const categories = [
    "Economic Discussion",
    "Political Discussion",
    "General Discussion",
  ] as const;
  const createdCategories = await ArrayUtil.asyncRepeat(3, async (index) => {
    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categories[index],
            slug: categories[index].toLowerCase().replace(/\s+/g, "-"),
            description: `Category for ${categories[index].toLowerCase()}`,
            sort_order: index + 1,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 3: Create member account who will submit reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "192.168.1.100",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create multiple articles to be reported
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_article_category_id: createdCategories[index % 3].id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 5: Create multiple reports with different violation categories
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const createdReports = await ArrayUtil.asyncRepeat(5, async (index) => {
    const report =
      await api.functional.discussionBoard.member.articles.reports.create(
        connection,
        {
          articleId: articles[index].id,
          body: {
            discussion_board_article_id: articles[index].id,
            report_category: reportCategories[index],
            report_details: `This article violates community guidelines: ${reportCategories[index]}. ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    return report;
  });

  // Step 6: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: "192.168.1.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/moderator/dashboard" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Retrieve member's complete report history with pagination
  const reportHistory =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reportHistory);

  // Step 8: Validate response structure and content
  TestValidator.equals(
    "pagination page number",
    reportHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reportHistory.pagination.limit, 10);
  TestValidator.equals(
    "total report count",
    reportHistory.pagination.records,
    5,
  );
  TestValidator.predicate(
    "all reports returned in single page",
    reportHistory.data.length === 5,
  );

  // Validate each report belongs to the member
  reportHistory.data.forEach((report, index) => {
    TestValidator.equals(
      `report ${index} belongs to member`,
      report.discussion_board_member_id,
      member.id,
    );
    TestValidator.equals(
      `report ${index} status is pending`,
      report.status,
      "pending",
    );
  });

  // Validate that all created reports are present
  const reportIds = reportHistory.data.map((r) => r.id);
  createdReports.forEach((createdReport) => {
    TestValidator.predicate(
      `created report ${createdReport.id} found in history`,
      reportIds.includes(createdReport.id),
    );
  });

  // Validate different report categories are represented
  const categoriesInResponse = reportHistory.data.map((r) => r.report_category);
  TestValidator.predicate(
    "multiple report categories present",
    new Set(categoriesInResponse).size >= 3,
  );
}

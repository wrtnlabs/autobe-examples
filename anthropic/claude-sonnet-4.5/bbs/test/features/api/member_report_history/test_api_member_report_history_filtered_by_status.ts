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
 * Test filtering member reports by resolution status.
 *
 * This test validates the ability to filter a member's report history by
 * status, specifically testing the 'pending' status filter to show only
 * unresolved reports.
 *
 * Test workflow:
 *
 * 1. Create moderator account for accessing filtered report history
 * 2. Create article categories for test content infrastructure
 * 3. Create member account for submitting multiple reports
 * 4. Create articles to be reported
 * 5. Submit multiple content reports with various categories
 * 6. Retrieve member's report history filtered by status='pending'
 * 7. Validate that response contains only pending reports
 * 8. Verify pagination structure and correct filtering behavior
 */
export async function test_api_member_report_history_filtered_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article categories
  const categories = await ArrayUtil.asyncRepeat(3, async (index) => {
    const categoryNames = [
      "Economic Discussion",
      "Political Discussion",
      "General Discussion",
    ] as const;
    const categorySlugs = [
      "economic-discussion",
      "political-discussion",
      "general-discussion",
    ] as const;

    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categoryNames[index],
            slug: categorySlugs[index],
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: index + 1,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 3: Create member account
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create articles to be reported
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          discussion_board_article_category_id:
            categories[index % categories.length].id,
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 5: Submit multiple content reports with various categories
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const reports = await ArrayUtil.asyncRepeat(5, async (index) => {
    const report =
      await api.functional.discussionBoard.member.articles.reports.create(
        connection,
        {
          articleId: articles[index].id,
          body: {
            discussion_board_article_id: articles[index].id,
            report_category: reportCategories[index],
            report_details: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    return report;
  });

  // Step 6: Switch to moderator and retrieve member's report history filtered by status='pending'
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const filteredReports =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          status: "pending" as const,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(filteredReports);

  // Step 7: Validate that response contains only pending reports
  TestValidator.equals(
    "all reports should have pending status",
    filteredReports.data.every((report) => report.status === "pending"),
    true,
  );

  // Step 8: Verify pagination structure
  TestValidator.predicate(
    "pagination should be valid",
    filteredReports.pagination.current === 1 &&
      filteredReports.pagination.limit === 20 &&
      filteredReports.pagination.records === reports.length &&
      filteredReports.data.length === reports.length,
  );

  // Verify all created reports are in the filtered results
  TestValidator.equals(
    "filtered report count matches created reports",
    filteredReports.data.length,
    reports.length,
  );
}

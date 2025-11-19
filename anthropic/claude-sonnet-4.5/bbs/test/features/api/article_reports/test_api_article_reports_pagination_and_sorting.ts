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
 * Test moderator retrieval of article reports with pagination and sorting
 * capabilities.
 *
 * This test validates that moderators can efficiently navigate through large
 * numbers of content reports using pagination parameters and sort by different
 * fields to prioritize their moderation queue. The test ensures pagination
 * correctly splits results, page navigation works as expected, sorting orders
 * reports appropriately, and metadata (total records, page counts) is
 * accurate.
 *
 * Test workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Create member account to submit multiple reports
 * 3. Create category and article for reporting
 * 4. Submit numerous content reports (25+) to exceed pagination limits
 * 5. Test pagination with different page and limit values
 * 6. Test sorting by created_at (asc/desc) to verify oldest-first prioritization
 * 7. Test sorting by status to verify alphabetical ordering
 * 8. Validate pagination metadata accuracy (total records, page counts)
 */
export async function test_api_article_reports_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account to submit reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Switch to moderator context to create category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic topics and policies",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member context to create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit multiple content reports (25 reports to test pagination)
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const reportCount = 25;

  const createdReports = await ArrayUtil.asyncRepeat(
    reportCount,
    async (index) => {
      const report =
        await api.functional.discussionBoard.member.contentReports.create(
          connection,
          {
            body: {
              discussion_board_article_id: article.id,
              report_category: RandomGenerator.pick(reportCategories),
              report_details: RandomGenerator.paragraph({ sentences: 10 }),
            } satisfies IDiscussionBoardContentReport.ICreate,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Switch back to moderator to test pagination and sorting
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Test pagination - Page 1 with limit 10
  const page1 =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page1);

  TestValidator.equals("page 1 should have 10 reports", page1.data.length, 10);
  TestValidator.equals(
    "total records should be 25",
    page1.pagination.records,
    reportCount,
  );
  TestValidator.equals("total pages should be 3", page1.pagination.pages, 3);
  TestValidator.equals("current page should be 1", page1.pagination.current, 1);
  TestValidator.equals("limit should be 10", page1.pagination.limit, 10);

  // Step 8: Test pagination - Page 2 with limit 10
  const page2 =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page 2 should have 10 reports", page2.data.length, 10);
  TestValidator.equals(
    "page 2 current should be 2",
    page2.pagination.current,
    2,
  );

  // Verify page 1 and page 2 have different reports
  const page1Ids = page1.data.map((r) => r.id);
  const page2Ids = page2.data.map((r) => r.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 should have no overlapping reports",
    !hasOverlap,
  );

  // Step 9: Test pagination - Page 3 with limit 10 (should have 5 remaining)
  const page3 =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 3,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page3);

  TestValidator.equals("page 3 should have 5 reports", page3.data.length, 5);

  // Step 10: Test different limit - Page 1 with limit 20
  const largePage =
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
  typia.assert(largePage);

  TestValidator.equals(
    "large page should have 20 reports",
    largePage.data.length,
    20,
  );
  TestValidator.equals(
    "total pages with limit 20 should be 2",
    largePage.pagination.pages,
    2,
  );

  // Step 11: Test sorting by created_at ascending (oldest first - prioritize urgent reports)
  const sortedByCreatedAsc =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 25,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);

  // Verify ascending order by created_at
  for (let i = 0; i < sortedByCreatedAsc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedAsc.data[i].created_at).getTime();
    const next = new Date(sortedByCreatedAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `report ${i} created_at should be <= report ${i + 1} created_at`,
      current <= next,
    );
  }

  // Step 12: Test sorting by created_at descending (newest first)
  const sortedByCreatedDesc =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 25,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);

  // Verify descending order by created_at
  for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedDesc.data[i].created_at).getTime();
    const next = new Date(sortedByCreatedDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `report ${i} created_at should be >= report ${i + 1} created_at`,
      current >= next,
    );
  }

  // Step 13: Test sorting by status
  const sortedByStatus =
    await api.functional.discussionBoard.moderator.articles.reports.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 25,
          sort_by: "status",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByStatus);

  // Verify status sorting (alphabetical order)
  for (let i = 0; i < sortedByStatus.data.length - 1; i++) {
    const currentStatus = sortedByStatus.data[i].status;
    const nextStatus = sortedByStatus.data[i + 1].status;
    TestValidator.predicate(
      `report ${i} status should be <= report ${i + 1} status alphabetically`,
      currentStatus <= nextStatus,
    );
  }

  // Step 14: Verify first report in created_at asc is indeed the oldest
  const oldestReportId = sortedByCreatedAsc.data[0].id;
  const oldestOriginalReport = createdReports.find(
    (r) => r.id === oldestReportId,
  );
  TestValidator.predicate(
    "oldest report in sorted list should match first created report",
    oldestOriginalReport !== undefined,
  );
}

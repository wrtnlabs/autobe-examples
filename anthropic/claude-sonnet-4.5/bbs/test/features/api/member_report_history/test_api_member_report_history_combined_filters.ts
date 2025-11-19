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
 * Test combining multiple filter parameters to create complex queries of member
 * reporting patterns.
 *
 * This test validates the advanced filtering capabilities of the member report
 * history API, ensuring moderators can combine status, category, and date range
 * filters with pagination and sorting to perform precise analysis of member
 * reporting behavior.
 *
 * Test workflow:
 *
 * 1. Create moderator account for API access
 * 2. Create article categories for test infrastructure
 * 3. Create member account who will submit reports
 * 4. Create multiple articles as report targets
 * 5. Submit diverse reports with varying categories and timestamps
 * 6. Query with combined filters: status='pending' AND category='Spam' AND date
 *    range
 * 7. Validate all filters apply correctly in combination
 * 8. Verify pagination works with filtered results
 * 9. Ensure sorting is maintained
 */
export async function test_api_member_report_history_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article categories
  const categories = await ArrayUtil.asyncRepeat(3, async () => {
    const categoryName = RandomGenerator.name(2);
    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
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
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create multiple articles as report targets
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 5 }),
          discussion_board_article_category_id:
            categories[index % categories.length].id,
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 5: Submit diverse reports with varying categories and timestamps
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
  ] as const;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const reports = await ArrayUtil.asyncRepeat(10, async (index) => {
    const report =
      await api.functional.discussionBoard.member.articles.reports.create(
        connection,
        {
          articleId: articles[index % articles.length].id,
          body: {
            discussion_board_article_id: articles[index % articles.length].id,
            report_category: reportCategories[index % reportCategories.length],
            report_details: RandomGenerator.paragraph({ sentences: 10 }),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    return report;
  });

  // Step 6: Switch to moderator account for querying reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Query with combined filters
  const filterResult =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 5,
          status: "pending" as const,
          report_category: "Spam" as const,
          created_at_from: sevenDaysAgo.toISOString(),
          sort_by: "created_at" as const,
          order: "asc" as const,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(filterResult);

  // Step 8: Validate all filters applied correctly
  TestValidator.predicate(
    "all returned reports should have status pending",
    filterResult.data.every((report) => report.status === "pending"),
  );

  TestValidator.predicate(
    "all returned reports should have category Spam",
    filterResult.data.every((report) => report.report_category === "Spam"),
  );

  TestValidator.predicate(
    "all returned reports should be within date range",
    filterResult.data.every((report) => {
      const createdDate = new Date(report.created_at);
      return createdDate >= sevenDaysAgo;
    }),
  );

  // Step 9: Verify pagination works with filtered results
  TestValidator.predicate(
    "page limit should be respected",
    filterResult.data.length <= 5,
  );

  TestValidator.equals(
    "current page should be 1",
    filterResult.pagination.current,
    1,
  );

  TestValidator.equals("limit should be 5", filterResult.pagination.limit, 5);

  // Step 10: Ensure sorting is maintained (ascending by created_at)
  if (filterResult.data.length > 1) {
    TestValidator.predicate(
      "reports should be sorted by created_at in ascending order",
      filterResult.data.every((report, index, arr) => {
        if (index === 0) return true;
        const prevDate = new Date(arr[index - 1].created_at);
        const currDate = new Date(report.created_at);
        return prevDate <= currDate;
      }),
    );
  }

  // Step 11: Test combined filters enable precise analysis
  TestValidator.predicate(
    "combined filtering provides precise member reporting analysis",
    filterResult.data.every(
      (report) =>
        report.status === "pending" &&
        report.report_category === "Spam" &&
        report.discussion_board_member_id === member.id,
    ),
  );
}

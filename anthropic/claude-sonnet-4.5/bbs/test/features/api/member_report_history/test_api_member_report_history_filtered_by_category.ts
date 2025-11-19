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
 * Test filtering member reporting history by report category.
 *
 * This test validates that moderators can retrieve a filtered list of reports
 * submitted by a specific member based on report_category. The test creates a
 * member who submits multiple reports across different categories (Spam,
 * Misinformation, Offensive Content), then retrieves reports filtered by
 * report_category='Misinformation' to verify only matching reports are
 * returned.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category-filtered queries
 * 2. Create article categories for test content organization
 * 3. Create member account for submitting categorized reports
 * 4. Create multiple articles for category-specific reporting
 * 5. Submit reports with different categories (Spam, Misinformation, Offensive
 *    Content)
 * 6. Switch to moderator and retrieve reports filtered by
 *    category='Misinformation'
 * 7. Validate only Misinformation reports are returned
 * 8. Verify other categories are excluded and pagination is maintained
 */
export async function test_api_member_report_history_filtered_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category-filtered queries
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create article categories for test content
  const categoryData1 = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description: "Economic policy and market discussions",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData1,
      },
    );
  typia.assert(category1);

  const categoryData2 = {
    name: "Political Discussion",
    slug: "political-discussion",
    description: "Political systems and governance discussions",
    sort_order: 2,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category2: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData2,
      },
    );
  typia.assert(category2);

  // Step 3: Create member account for submitting categorized reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    password: "member123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "192.168.1.101",
    href: "https://example.com/member/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create multiple articles for category-specific reporting
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const articleData = {
        title: `${RandomGenerator.name(3)} Article ${index + 1}`,
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id:
          index === 0 ? category1.id : category2.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate;

      const article: IDiscussionBoardArticle =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: articleData,
          },
        );
      typia.assert(article);
      return article;
    },
  );

  // Step 5: Submit reports with different categories
  const reportCategories = [
    "Spam",
    "Misinformation",
    "Offensive Content",
    "Misinformation",
    "Spam",
  ] as const;

  const reports: IDiscussionBoardContentReport[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const reportData = {
        discussion_board_article_id: articles[index % articles.length].id,
        report_category: reportCategories[index],
        report_details: `This article contains ${reportCategories[index].toLowerCase()} content. ${RandomGenerator.paragraph({ sentences: 2 })}`,
      } satisfies IDiscussionBoardContentReport.ICreate;

      const report: IDiscussionBoardContentReport =
        await api.functional.discussionBoard.member.articles.reports.create(
          connection,
          {
            articleId: articles[index % articles.length].id,
            body: reportData,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Switch to moderator and retrieve reports filtered by category='Misinformation'
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: "192.168.1.100",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/join",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const filteredReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {
          report_category: "Misinformation",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(filteredReports);

  // Step 7: Validate only Misinformation reports are returned
  TestValidator.predicate(
    "filtered results should not be empty",
    filteredReports.data.length > 0,
  );

  TestValidator.predicate(
    "all returned reports should have category Misinformation",
    filteredReports.data.every(
      (report) => report.report_category === "Misinformation",
    ),
  );

  const expectedMisinformationCount = reportCategories.filter(
    (cat) => cat === "Misinformation",
  ).length;
  TestValidator.equals(
    "filtered results count should match Misinformation reports count",
    filteredReports.data.length,
    expectedMisinformationCount,
  );

  // Step 8: Verify pagination structure is maintained
  TestValidator.predicate(
    "pagination should be properly structured",
    filteredReports.pagination !== null &&
      filteredReports.pagination !== undefined,
  );

  TestValidator.equals(
    "pagination records should match filtered count",
    filteredReports.pagination.records,
    expectedMisinformationCount,
  );

  TestValidator.predicate(
    "no Spam reports should be in filtered results",
    !filteredReports.data.some((report) => report.report_category === "Spam"),
  );

  TestValidator.predicate(
    "no Offensive Content reports should be in filtered results",
    !filteredReports.data.some(
      (report) => report.report_category === "Offensive Content",
    ),
  );
}

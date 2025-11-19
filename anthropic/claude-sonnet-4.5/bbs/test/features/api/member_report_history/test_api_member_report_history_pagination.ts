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
 * Test pagination functionality when retrieving member report history.
 *
 * This test validates that the pagination system correctly handles member
 * report history retrieval, including accurate metadata, proper page
 * boundaries, and ensuring each report appears exactly once across paginated
 * results.
 *
 * Test workflow:
 *
 * 1. Create moderator account for querying report history
 * 2. Create article categories for test content
 * 3. Create member account who will submit reports
 * 4. Create multiple articles for reporting
 * 5. Submit 27 reports (exceeding default page size of 20)
 * 6. Retrieve first page with limit=5 and validate pagination metadata
 * 7. Retrieve all subsequent pages and verify no duplicates/missing reports
 * 8. Validate pagination totals and page count accuracy
 */
export async function test_api_member_report_history_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create article categories
  const categoryData = {
    name: "Test Discussion Category",
    slug: "test-discussion-category",
    description: "Category for testing report pagination",
    sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account who will submit reports
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "member123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    ip: "127.0.0.1",
    href: "https://example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create multiple articles (need at least 27 for our test)
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    27,
    async (index) => {
      const articleData = {
        title: `Test Article ${index + 1} - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
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

  // Step 5: Submit 27 reports (one per article)
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const submittedReports: IDiscussionBoardContentReport[] =
    await ArrayUtil.asyncRepeat(27, async (index) => {
      const reportData = {
        discussion_board_article_id: articles[index].id,
        report_category: RandomGenerator.pick(reportCategories),
        report_details: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardContentReport.ICreate;

      const report: IDiscussionBoardContentReport =
        await api.functional.discussionBoard.member.articles.reports.create(
          connection,
          {
            articleId: articles[index].id,
            body: reportData,
          },
        );
      typia.assert(report);
      return report;
    });

  // Step 6: Switch to moderator account and retrieve first page with limit=5
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const firstPageRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardContentReport.IRequest;

  const firstPage: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  // Step 7: Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.records,
    27,
  );
  TestValidator.equals("first page total pages", firstPage.pagination.pages, 6);
  TestValidator.equals("first page data length", firstPage.data.length, 5);

  // Step 8: Retrieve all pages and collect all reports
  const allReportsFromPages: IDiscussionBoardContentReport.ISummary[] = [
    ...firstPage.data,
  ];

  for (let pageNum = 2; pageNum <= 6; pageNum++) {
    const pageRequest = {
      page: pageNum satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IDiscussionBoardContentReport.IRequest;

    const page: IPageIDiscussionBoardContentReport.ISummary =
      await api.functional.discussionBoard.moderator.members.reports.index(
        connection,
        {
          memberId: member.id,
          body: pageRequest,
        },
      );
    typia.assert(page);

    // Validate pagination metadata for each page
    TestValidator.equals(
      `page ${pageNum} current`,
      page.pagination.current,
      pageNum,
    );
    TestValidator.equals(`page ${pageNum} limit`, page.pagination.limit, 5);
    TestValidator.equals(
      `page ${pageNum} total records`,
      page.pagination.records,
      27,
    );
    TestValidator.equals(
      `page ${pageNum} total pages`,
      page.pagination.pages,
      6,
    );

    // Last page should have 2 reports (27 % 5 = 2)
    if (pageNum === 6) {
      TestValidator.equals("last page data length", page.data.length, 2);
    } else {
      TestValidator.equals(`page ${pageNum} data length`, page.data.length, 5);
    }

    allReportsFromPages.push(...page.data);
  }

  // Step 9: Validate all reports were retrieved exactly once
  TestValidator.equals(
    "total reports collected",
    allReportsFromPages.length,
    27,
  );

  // Step 10: Verify no duplicate report IDs
  const reportIds = allReportsFromPages.map((r) => r.id);
  const uniqueIds = new Set(reportIds);
  TestValidator.equals("no duplicate reports", uniqueIds.size, 27);

  // Step 11: Verify all submitted reports are present in paginated results
  for (const submittedReport of submittedReports) {
    const found = allReportsFromPages.find((r) => r.id === submittedReport.id);
    TestValidator.predicate(
      `report ${submittedReport.id} exists in paginated results`,
      found !== undefined,
    );
  }
}

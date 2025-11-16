import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test pagination controls by creating a large set of articles and navigating
 * through multiple pages.
 *
 * This test validates comprehensive pagination functionality including:
 *
 * 1. Creating a member account for authentication
 * 2. Generating a large dataset of articles (40 articles) to enable multi-page
 *    testing
 * 3. Testing different page sizes (limit values: 1, 5, 10, 20, 50, 100)
 * 4. Testing page navigation across multiple pages (page 1, 2, 3, etc.)
 * 5. Testing edge cases: first page, last page, empty pages beyond available data
 * 6. Validating pagination metadata accuracy: total records, total pages, current
 *    page, limit
 *
 * The test ensures robust pagination implementation by verifying correct data
 * retrieval, accurate metadata calculation, and proper handling of boundary
 * conditions.
 */
export async function test_api_article_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Generate large article dataset (40 articles)
  const articleCount = 40;
  const createdArticles: IDiscussionBoardArticle[] =
    await ArrayUtil.asyncRepeat(articleCount, async (index) => {
      const articleData = {
        title: `Test Article ${index + 1} - ${RandomGenerator.name(3)}`,
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.ICreate;

      const article: IDiscussionBoardArticle =
        await api.functional.discussionBoard.articles.create(connection, {
          body: articleData,
        });
      typia.assert(article);
      return article;
    });

  // Step 3: Test various page sizes (limit values)
  const limitTests = [1, 5, 10, 20, 50, 100] as const;
  for (const limit of limitTests) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);

    // Validate pagination metadata
    TestValidator.equals(
      "total records matches article count",
      result.pagination.records,
      articleCount,
    );

    const expectedPages = Math.ceil(articleCount / limit);
    TestValidator.equals(
      "total pages calculation correct",
      result.pagination.pages,
      expectedPages,
    );
    TestValidator.equals("current page is 1", result.pagination.current, 1);
    TestValidator.equals(
      "limit matches request",
      result.pagination.limit,
      limit,
    );

    // Validate data array length
    const expectedDataLength = Math.min(limit, articleCount);
    TestValidator.equals(
      "data length matches limit or remaining articles",
      result.data.length,
      expectedDataLength,
    );
  }

  // Step 4: Test page navigation with fixed limit
  const navigationLimit = 10;
  const totalPages = Math.ceil(articleCount / navigationLimit);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageResult: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          page: pageNum,
          limit: navigationLimit,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(pageResult);

    TestValidator.equals(
      "current page matches request",
      pageResult.pagination.current,
      pageNum,
    );
    TestValidator.equals(
      "records count consistent",
      pageResult.pagination.records,
      articleCount,
    );
    TestValidator.equals(
      "total pages consistent",
      pageResult.pagination.pages,
      totalPages,
    );
    TestValidator.equals(
      "limit consistent",
      pageResult.pagination.limit,
      navigationLimit,
    );

    // Validate data length for each page
    const isLastPage = pageNum === totalPages;
    const expectedLength = isLastPage
      ? articleCount - (pageNum - 1) * navigationLimit
      : navigationLimit;
    TestValidator.equals(
      "page data length correct",
      pageResult.data.length,
      expectedLength,
    );
  }

  // Step 5: Test edge case - first page explicitly
  const firstPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct data length",
    firstPage.data.length,
    15,
  );
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );

  // Step 6: Test edge case - last page with partial results
  const lastPageLimit = 7;
  const lastPageNumber = Math.ceil(articleCount / lastPageLimit);
  const lastPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: lastPageNumber,
        limit: lastPageLimit,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(lastPage);

  const expectedLastPageLength =
    articleCount - (lastPageNumber - 1) * lastPageLimit;
  TestValidator.equals(
    "last page has partial results",
    lastPage.data.length,
    expectedLastPageLength,
  );
  TestValidator.predicate(
    "last page length less than limit",
    lastPage.data.length <= lastPageLimit,
  );

  // Step 7: Test edge case - page beyond available data
  const beyondPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: totalPages + 5,
        limit: navigationLimit,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(beyondPage);
  TestValidator.equals(
    "page beyond data returns empty array",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination metadata still accurate",
    beyondPage.pagination.records,
    articleCount,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article search with pagination to ensure large result sets are properly
 * divided into pages. The search operation accepts configurable page size
 * parameters and returns paginated results with proper offset calculations. The
 * test validates that pagination returns correct number of results per page,
 * maintains proper ordering across pages, and includes pagination metadata
 * (total count, current page, pages available). The test also ensures
 * subsequent page requests return different articles and that out-of-range page
 * requests are handled appropriately.
 */
export async function test_api_article_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create a member account for article authorship
  const memberRegisterRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const memberResponse = await api.functional.auth.member.join(connection, {
    body: memberRegisterRequest,
  });
  typia.assert(memberResponse);

  // 2. Create multiple test articles to populate the database for pagination testing
  const articleCount = 25; // More than 2 pages worth with various limits
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const articleCreateRequest = {
      title: `Test Article ${i + 1}`,
      content: `This is test article content number ${i + 1}. It contains enough text to meet the minimum length requirement for article creation.`,
      category_code: i % 2 === 0 ? "economics" : "politics",
    } satisfies IDiscussionBoardArticle.ICreate;

    const createdArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: articleCreateRequest,
      });
    typia.assert(createdArticle);
    createdArticles.push(createdArticle);
  }

  TestValidator.equals(
    "all test articles created successfully",
    createdArticles.length,
    articleCount,
  );

  // 3. Test pagination with page size of 10
  const pageSize10 = 10;
  const searchRequest1 = {
    limit: pageSize10,
    page: 1,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page1Result =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: searchRequest1,
    });
  typia.assert(page1Result);

  // Validate first page results
  TestValidator.equals(
    "first page has correct limit",
    page1Result.pagination.limit,
    pageSize10,
  );
  TestValidator.equals(
    "first page has correct current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page data length matches limit",
    page1Result.data.length,
    pageSize10,
  );
  TestValidator.predicate(
    "first page total records equals article count",
    page1Result.pagination.records === articleCount,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1Result.pagination.pages >= 3, // At least 3 pages for 25 articles with limit 10
  );

  // 4. Retrieve second page with same page size
  const searchRequest2 = {
    limit: pageSize10,
    page: 2,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page2Result =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: searchRequest2,
    });
  typia.assert(page2Result);

  // Validate second page results
  TestValidator.equals(
    "second page has correct limit",
    page2Result.pagination.limit,
    pageSize10,
  );
  TestValidator.equals(
    "second page has correct current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page data length matches limit",
    page2Result.data.length,
    pageSize10,
  );
  TestValidator.notEquals(
    "second page articles differ from first page",
    page2Result.data[0].id,
    page1Result.data[0].id,
  );

  // 5. Test pagination with different page size (5)
  const pageSize5 = 5;
  const searchRequest3 = {
    limit: pageSize5,
    page: 1,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page3Result =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: searchRequest3,
    });
  typia.assert(page3Result);

  // Validate results with different page size
  TestValidator.equals(
    "page with limit 5 returns 5 items",
    page3Result.data.length,
    pageSize5,
  );
  TestValidator.equals(
    "pagination metadata has correct limit for page size 5",
    page3Result.pagination.limit,
    pageSize5,
  );
  TestValidator.predicate(
    "more pages available with smaller page size",
    page3Result.pagination.pages > 3,
  );

  // 6. Test third page with page size 10 to verify offset calculations
  const searchRequest4 = {
    limit: pageSize10,
    page: 3,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page4Result =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: searchRequest4,
    });
  typia.assert(page4Result);

  // Validate third page
  TestValidator.equals(
    "third page has remaining articles",
    page4Result.data.length,
    articleCount - pageSize10 * 2, // Should have 5 articles (25 - 20)
  );
  TestValidator.equals(
    "third page has correct current page",
    page4Result.pagination.current,
    3,
  );
  TestValidator.notEquals(
    "third page articles differ from first page",
    page4Result.data[0].id,
    page1Result.data[0].id,
  );
  TestValidator.notEquals(
    "third page articles differ from second page",
    page4Result.data[0].id,
    page2Result.data[0].id,
  );

  // 7. Verify ordering consistency across pages
  TestValidator.predicate(
    "no article appears on multiple pages",
    !page2Result.data.some((article) =>
      page1Result.data.some((page1Article) => page1Article.id === article.id),
    ),
  );

  TestValidator.predicate(
    "articles on page 1 and page 3 are different",
    !page4Result.data.some((article) =>
      page1Result.data.some((page1Article) => page1Article.id === article.id),
    ),
  );

  // 8. Test with very large page number (out of range)
  const searchRequest5 = {
    limit: pageSize10,
    page: 100, // Way beyond available pages
  } satisfies IDiscussionBoardArticle.IRequest;

  const outOfRangeResult =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: searchRequest5,
    });
  typia.assert(outOfRangeResult);

  // Out of range page should return empty results but valid pagination metadata
  TestValidator.equals(
    "out of range page returns empty data",
    outOfRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "out of range page has correct total records count",
    outOfRangeResult.pagination.records,
    articleCount,
  );
}

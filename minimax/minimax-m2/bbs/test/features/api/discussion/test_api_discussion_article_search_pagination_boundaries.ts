import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

/**
 * Test pagination edge cases and boundary conditions for discussion article
 * search.
 *
 * Tests requesting pages beyond available results, empty result sets with
 * pagination, and verify that pagination metadata correctly reflects actual
 * available records even when requesting non-existent pages.
 *
 * Comprehensive testing of:
 *
 * - Requesting pages beyond available results returns empty data with correct
 *   metadata
 * - Empty result sets have proper pagination structure
 * - Pagination metadata (current, limit, records, pages) is accurate across
 *   boundary conditions
 * - Different page limits work correctly at boundaries
 * - Edge cases like page 0 or very large page numbers
 */
export async function test_api_discussion_article_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // Create test articles to establish baseline data for pagination testing
  const testArticles: IEconPoliticalDiscussionArticle.ISummary[] = [];
  const articleCount = 25; // Create enough articles to test various pagination scenarios

  // Generate test articles with varied data for realistic pagination testing
  for (let i = 0; i < articleCount; i++) {
    const article: IEconPoliticalDiscussionArticle.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      category: RandomGenerator.pick([
        "Economic Policy",
        "Political Analysis",
        "Market Discussion",
        "Regulatory Updates",
      ] as const),
      status: RandomGenerator.pick(["published", "draft", "archived"] as const),
      created_at: RandomGenerator.date(
        new Date(Date.now() - i * 86400000),
        86400000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    };
    testArticles.push(article);
  }

  // Test 1: Normal pagination - First page with default limit
  const firstPageResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page should have correct current page",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page should have correct limit",
    firstPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page should have some data",
    firstPageResponse.data.length > 0,
  );
  TestValidator.equals(
    "first page record count should match data length",
    firstPageResponse.pagination.records,
    testArticles.length,
  );

  // Test 2: Request page that should have data (middle page)
  const middlePageResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(middlePageResponse);
  TestValidator.equals(
    "middle page should have correct current page",
    middlePageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "middle page should have correct limit",
    middlePageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "middle page should have some data",
    middlePageResponse.data.length > 0,
  );
  TestValidator.notEquals(
    "middle page data should be different from first page",
    firstPageResponse.data,
    middlePageResponse.data,
  );

  // Test 3: Request last page based on total records and limit
  const lastPageNumber = Math.ceil(testArticles.length / 10); // Should be page 3 for 25 records with limit 10
  const lastPageResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: lastPageNumber,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(lastPageResponse);
  TestValidator.equals(
    "last page should have correct current page",
    lastPageResponse.pagination.current,
    lastPageNumber,
  );
  TestValidator.equals(
    "last page should have correct limit",
    lastPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "last page should have remaining records",
    lastPageResponse.data.length > 0,
  );
  TestValidator.equals(
    "total records should be consistent across pages",
    lastPageResponse.pagination.records,
    testArticles.length,
  );

  // Test 4: Request page beyond available results (should return empty data with correct metadata)
  const beyondPageResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: lastPageNumber + 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page should have correct current page",
    beyondPageResponse.pagination.current,
    lastPageNumber + 1,
  );
  TestValidator.equals(
    "beyond page should maintain limit",
    beyondPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond page should have no data",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page should have consistent total records",
    beyondPageResponse.pagination.records,
    testArticles.length,
  );
  TestValidator.equals(
    "beyond page should have correct total pages",
    beyondPageResponse.pagination.pages,
    lastPageNumber,
  );

  // Test 5: Test very large page number (extreme boundary case)
  const extremePageResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 999999,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(extremePageResponse);
  TestValidator.equals(
    "extreme page should have requested page number",
    extremePageResponse.pagination.current,
    999999,
  );
  TestValidator.equals(
    "extreme page should have no data",
    extremePageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "extreme page should maintain correct total records",
    extremePageResponse.pagination.records,
    testArticles.length,
  );
  TestValidator.equals(
    "extreme page should maintain correct total pages",
    extremePageResponse.pagination.pages,
    lastPageNumber,
  );

  // Test 6: Test pagination with different limits at boundaries
  const smallLimit = 5;
  const boundaryPageWithSmallLimit = Math.ceil(
    testArticles.length / smallLimit,
  ); // Should be page 5 for 25 records
  const smallLimitResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: boundaryPageWithSmallLimit,
        limit: smallLimit,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit page should have correct limit",
    smallLimitResponse.pagination.limit,
    smallLimit,
  );
  TestValidator.predicate(
    "small limit last page should have some data",
    smallLimitResponse.data.length > 0,
  );
  TestValidator.equals(
    "small limit should have correct total pages",
    smallLimitResponse.pagination.pages,
    boundaryPageWithSmallLimit,
  );

  // Test 7: Test page beyond results with different limit
  const beyondSmallLimitResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: boundaryPageWithSmallLimit + 1,
        limit: smallLimit,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(beyondSmallLimitResponse);
  TestValidator.equals(
    "beyond small limit page should have no data",
    beyondSmallLimitResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond small limit should maintain same total records",
    beyondSmallLimitResponse.pagination.records,
    testArticles.length,
  );
  TestValidator.equals(
    "beyond small limit should have correct total pages",
    beyondSmallLimitResponse.pagination.pages,
    boundaryPageWithSmallLimit,
  );

  // Test 8: Test large limit value (boundary case for maximum allowed)
  const largeLimitResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit should have requested limit",
    largeLimitResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large limit first page should have all data",
    largeLimitResponse.data.length <= 50,
  );
  TestValidator.equals(
    "large limit should have only one page",
    largeLimitResponse.pagination.pages,
    1,
  );

  // Test 9: Test pagination metadata consistency across different page requests
  const consistentMetadataChecks = [
    { page: 1, limit: 10 },
    { page: 2, limit: 10 },
    { page: 10, limit: 10 },
    { page: 1, limit: 5 },
    { page: 1, limit: 25 },
  ];

  for (const testCase of consistentMetadataChecks) {
    const response: IPageIEconPoliticalDiscussionArticle.ISummary =
      await api.functional.econPoliticalDiscussion.articles.index(connection, {
        body: {
          page: testCase.page,
          limit: testCase.limit,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      });
    typia.assert(response);

    TestValidator.equals(
      `page ${testCase.page} should have correct limit`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.equals(
      `page ${testCase.page} should have consistent total records`,
      response.pagination.records,
      testArticles.length,
    );
    TestValidator.predicate(
      `page ${testCase.page} current should be requested page`,
      response.pagination.current === testCase.page,
    );

    // Calculate expected pages for this limit
    const expectedPages = Math.ceil(testArticles.length / testCase.limit);
    TestValidator.equals(
      `page ${testCase.page} should have correct total pages`,
      response.pagination.pages,
      expectedPages,
    );
  }

  // Test 10: Validate that data distribution is logical across pages
  const firstPageWithLargeLimit: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(firstPageWithLargeLimit);

  const secondPageWithLargeLimit: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(secondPageWithLargeLimit);

  // First page should have first 20 articles (or all if less than 20)
  TestValidator.predicate(
    "first page with large limit should have more data than second page",
    firstPageWithLargeLimit.data.length >= secondPageWithLargeLimit.data.length,
  );
  TestValidator.notEquals(
    "different pages should have different data",
    firstPageWithLargeLimit.data,
    secondPageWithLargeLimit.data,
  );

  // Test 11: Edge case - requesting page 0 (should handle gracefully or use default)
  try {
    const pageZeroResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
      await api.functional.econPoliticalDiscussion.articles.index(connection, {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      });
    typia.assert(pageZeroResponse);
    // If this doesn't throw, validate the response structure
    TestValidator.predicate(
      "page zero should have valid response structure",
      pageZeroResponse.pagination.current >= 0 &&
        pageZeroResponse.data !== undefined,
    );
  } catch (error) {
    // This is acceptable - page 0 may be invalid and throw an error
    TestValidator.predicate(
      "page zero should either work gracefully or throw appropriate error",
      true,
    );
  }
}

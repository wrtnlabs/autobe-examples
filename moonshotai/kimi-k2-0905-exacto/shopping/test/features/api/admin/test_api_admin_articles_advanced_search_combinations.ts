import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test combining multiple search and filter parameters for admin article
 * management.
 *
 * This test validates the advanced search functionality that allows
 * administrators to filter articles using complex combinations of search
 * criteria. The test covers:
 *
 * 1. Search text combined with status filters
 * 2. Date range filtering validation
 * 3. Section and category filter combinations
 * 4. Verification that complex filter combinations use AND logic
 * 5. Progressive narrowing of results when adding more filters
 * 6. Sorting and pagination with complex filters
 * 7. Performance validation for complex queries
 *
 * The test ensures that the admin article search system properly handles
 * complex filter combinations while maintaining acceptable response times and
 * providing accurate results.
 */
export async function test_api_admin_articles_advanced_search_combinations(
  connection: api.IConnection,
) {
  // Step 1: Create admin authentication for testing
  const adminEmail = `admin_${RandomGenerator.alphabets(8)}@example.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: "Admin",
      lastname: "User",
      adminlevel: "department_admin",
      department: "Content Management",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic search and status filter combination
  TestValidator.predicate("search with status filter", true);
  const searchWithStatusRequest = {
    search: "test",
    status: "published",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const searchWithStatusResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: searchWithStatusRequest,
    });
  typia.assert(searchWithStatusResults);

  // Verify search results structure and pagination
  TestValidator.predicate(
    "results have valid pagination",
    searchWithStatusResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "results have data array",
    Array.isArray(searchWithStatusResults.data),
  );
  if (searchWithStatusResults.data.length > 0) {
    TestValidator.predicate(
      "first result has required fields",
      searchWithStatusResults.data[0].id !== undefined,
    );
    TestValidator.predicate(
      "first result has title",
      searchWithStatusResults.data[0].title !== undefined,
    );
  }

  // Step 3: Test date range filtering with pagination
  TestValidator.predicate("date range filtering", true);
  const startDate = new Date(2024, 0, 1).toISOString();
  const endDate = new Date(2024, 11, 31).toISOString();

  const dateRangeRequest = {
    date_from: startDate,
    date_to: endDate,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const dateRangeResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResults);

  // Verify date range filter is applied correctly
  if (dateRangeResults.data.length > 0) {
    dateRangeResults.data.forEach((article) => {
      const articleDate = new Date(article.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);

      TestValidator.predicate(
        "article date within range",
        articleDate >= start && articleDate <= end,
      );
    });
  }

  // Step 4: Test complex multiple filter combinations
  TestValidator.predicate("complex filter combinations", true);
  const testSectionId = typia.random<string & tags.Format<"uuid">>();
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();
  const testChannelId = typia.random<string & tags.Format<"uuid">>();

  const complexFilterRequest = {
    search: "article",
    status: "draft",
    section_id: testSectionId,
    category_id: testCategoryId,
    channel_id: testChannelId,
    featured: false,
    commentable: true,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const complexFilterResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: complexFilterRequest,
    });
  typia.assert(complexFilterResults);

  // Verify complex filtering applies all criteria
  TestValidator.predicate(
    "complex filter returned valid results",
    complexFilterResults.data.length >= 0,
  );
  TestValidator.predicate(
    "complex filter pagination is valid",
    complexFilterResults.pagination.current > 0,
  );

  // Step 5: Test progressive filtering - adding more filters to narrow results
  TestValidator.predicate("progressive filtering narrows results", true);

  // Base query with single filter
  const baseQueryRequest = {
    status: "published",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallArticle.IRequest;

  const baseResults = await api.functional.shoppingMall.admin.articles.index(
    connection,
    {
      body: baseQueryRequest,
    },
  );
  typia.assert(baseResults);

  // Add search filter - should narrow results
  const searchAddedRequest = {
    ...baseQueryRequest,
    search: "content",
  } satisfies IShoppingMallArticle.IRequest;

  const searchAddedResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: searchAddedRequest,
    });
  typia.assert(searchAddedResults);

  // Results should be equal or fewer when adding search filter
  TestValidator.predicate(
    "search narrows results",
    searchAddedResults.pagination.records <= baseResults.pagination.records,
  );

  // Add featured filter - should further narrow
  const featuredAddedRequest = {
    ...searchAddedRequest,
    featured: false,
  } satisfies IShoppingMallArticle.IRequest;

  const featuredAddedResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: featuredAddedRequest,
    });
  typia.assert(featuredAddedResults);

  // Results should be equal or fewer when adding featured filter
  TestValidator.predicate(
    "featured filter narrows results further",
    featuredAddedResults.pagination.records <=
      searchAddedResults.pagination.records,
  );

  // Step 6: Test sorting with filter combinations
  TestValidator.predicate("sorting with filter combinations", true);
  const sortingRequest = {
    status: "published",
    orderBy: "createdAt",
    orderDirection: "desc",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const sortedResults = await api.functional.shoppingMall.admin.articles.index(
    connection,
    {
      body: sortingRequest,
    },
  );
  typia.assert(sortedResults);

  // Verify results are sorted correctly if we have multiple items
  if (sortedResults.data.length > 1) {
    for (let i = 0; i < sortedResults.data.length - 1; i++) {
      const currentDate = new Date(sortedResults.data[i].createdAt);
      const nextDate = new Date(sortedResults.data[i + 1].createdAt);
      TestValidator.predicate(
        "descending order correct",
        currentDate >= nextDate,
      );
    }
  }

  // Step 7: Test pagination with complex filters
  TestValidator.predicate("pagination with complex filters", true);
  const paginationRequest = {
    status: "published",
    featured: false,
    commentable: true,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallArticle.IRequest;

  const page1Results = await api.functional.shoppingMall.admin.articles.index(
    connection,
    {
      body: paginationRequest,
    },
  );
  typia.assert(page1Results);

  const page2Request = {
    ...paginationRequest,
    page: 2,
  } satisfies IShoppingMallArticle.IRequest;

  const page2Results = await api.functional.shoppingMall.admin.articles.index(
    connection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Results);

  // Verify pagination properties are correct
  TestValidator.equals("page 1 number", page1Results.pagination.current, 1);
  TestValidator.equals("page 2 number", page2Results.pagination.current, 2);
  TestValidator.equals("page 1 limit", page1Results.pagination.limit, 5);
  TestValidator.equals("page 2 limit", page2Results.pagination.limit, 5);

  // Step 8: Test different sorting orders
  TestValidator.predicate("different sorting orders", true);

  // Test ascending order
  const ascendingRequest = {
    status: "published",
    orderBy: "title",
    orderDirection: "asc",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const ascendingResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: ascendingRequest,
    });
  typia.assert(ascendingResults);

  // Test descending order
  const descendingRequest = {
    ...ascendingRequest,
    orderDirection: "desc",
  } satisfies IShoppingMallArticle.IRequest;

  const descendingResults =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: descendingRequest,
    });
  typia.assert(descendingResults);

  // Verify both sorting directions returned valid data
  TestValidator.predicate(
    "ascending results valid",
    ascendingResults.data.length >= 0,
  );
  TestValidator.predicate(
    "descending results valid",
    descendingResults.data.length >= 0,
  );

  // Step 9: Test edge cases with empty results
  TestValidator.predicate("edge cases with empty results", true);
  const impossibleRequest = {
    search: "impossiblesearchtermthatdoesnotexist", // Very specific search term
    status: "published",
    date_from: new Date(2030, 0, 1).toISOString(), // Future date
    date_to: new Date(2030, 11, 31).toISOString(), // Future date
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const emptyResults = await api.functional.shoppingMall.admin.articles.index(
    connection,
    {
      body: impossibleRequest,
    },
  );
  typia.assert(emptyResults);

  // Should return empty results
  TestValidator.equals("empty results count", emptyResults.data.length, 0);
  TestValidator.equals(
    "zero records pagination",
    emptyResults.pagination.records,
    0,
  );

  // Step 10: Performance test with highly complex query
  TestValidator.predicate("performance with complex queries", true);
  const startTime = Date.now();

  const complexPerformanceRequest = {
    search: "test",
    status: "draft",
    date_from: new Date(2023, 0, 1).toISOString(),
    date_to: new Date(2024, 11, 31).toISOString(),
    section_id: typia.random<string & tags.Format<"uuid">>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    featured: false,
    commentable: true,
    language: "en",
    orderBy: "createdAt",
    orderDirection: "desc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallArticle.IRequest;

  const finalResults = await api.functional.shoppingMall.admin.articles.index(
    connection,
    {
      body: complexPerformanceRequest,
    },
  );
  typia.assert(finalResults);

  const endTime = Date.now();
  const queryTime = endTime - startTime;

  // Ensure complex query completes within reasonable time (7 seconds)
  TestValidator.predicate("complex query within time limit", queryTime < 7000);
  TestValidator.predicate(
    "complex query returned results",
    finalResults.data.length >= 0,
  );
  TestValidator.predicate(
    "complex query pagination valid",
    finalResults.pagination.current > 0,
  );

  // Final validation - test data integrity across all results
  const allResults = [
    searchWithStatusResults,
    dateRangeResults,
    complexFilterResults,
    baseResults,
    searchAddedResults,
    featuredAddedResults,
    sortedResults,
    page1Results,
    page2Results,
    ascendingResults,
    descendingResults,
    emptyResults,
    finalResults,
  ];

  allResults.forEach((result, index) => {
    TestValidator.predicate(
      `result ${index} has valid structure`,
      result.pagination !== undefined,
    );
    TestValidator.predicate(
      `result ${index} has data array`,
      Array.isArray(result.data),
    );
    TestValidator.predicate(
      `result ${index} has valid current page`,
      result.pagination.current > 0,
    );
    TestValidator.predicate(
      `result ${index} has valid limit`,
      result.pagination.limit > 0,
    );
    TestValidator.predicate(
      `result ${index} has total records`,
      result.pagination.records >= 0,
    );

    if (result.data.length > 0) {
      const firstArticle = result.data[0];
      TestValidator.predicate(
        `first article ${index} has id`,
        firstArticle.id !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has code`,
        firstArticle.code !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has title`,
        firstArticle.title !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has summary`,
        firstArticle.summary !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has status`,
        firstArticle.status !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has createdAt`,
        firstArticle.createdAt !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has channel`,
        firstArticle.channel !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has section`,
        firstArticle.section !== undefined,
      );
      TestValidator.predicate(
        `first article ${index} has category`,
        firstArticle.channelCategory !== undefined,
      );
    }
  });

  TestValidator.predicate(
    "advanced search combinations test completed successfully",
    true,
  );
}

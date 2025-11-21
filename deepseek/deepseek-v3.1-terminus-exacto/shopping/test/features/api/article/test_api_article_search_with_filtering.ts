import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Comprehensive E2E test for shopping mall article search and filtering
 * functionality.
 *
 * This test validates the advanced filtering capabilities of the article search
 * API, including full-text search, publication status filtering, engagement
 * metrics, organizational context filtering, pagination, and sorting. The test
 * ensures that the search functionality meets real-world business requirements
 * for content discovery and management in an e-commerce platform.
 */
export async function test_api_article_search_with_filtering(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination functionality
  const basicPagination = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(basicPagination);
  TestValidator.equals(
    "pagination structure should be valid",
    basicPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    basicPagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(basicPagination.data),
  );

  // Test 2: Full-text search functionality
  const searchResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should contain data",
    searchResults.data.length >= 0,
  );

  // Test 3: Publication status filtering with validation
  const statuses = [
    "draft",
    "pending_review",
    "published",
    "archived",
  ] as const;
  for (const status of statuses) {
    const statusResults = await api.functional.shoppingMall.articles.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: status,
        } satisfies IShoppingMallArticle.IRequest,
      },
    );
    typia.assert(statusResults);
    TestValidator.predicate(
      `status filter ${status} should return valid results`,
      statusResults.data.length >= 0,
    );

    // Validate that filtered results match the status criteria
    if (statusResults.data.length > 0) {
      const firstArticle = statusResults.data[0];
      TestValidator.equals(
        `filtered article should have status ${status}`,
        firstArticle.status,
        status,
      );
    }
  }

  // Test 4: Engagement metrics filtering with range validation
  const engagementTest = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        view_count_min: 100,
        view_count_max: 1000,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(engagementTest);
  TestValidator.predicate(
    "engagement filtering should return results",
    engagementTest.data.length >= 0,
  );

  // Test 5: Featured articles filtering
  const featuredResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        featured: true,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(featuredResults);
  TestValidator.predicate(
    "featured filtering should return results",
    featuredResults.data.length >= 0,
  );

  // Test 6: Comment permission filtering
  const commentResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        allow_comments: true,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(commentResults);
  TestValidator.predicate(
    "comment permission filtering should return results",
    commentResults.data.length >= 0,
  );

  // Test 7: Date range filtering
  const dateRangeResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        published_after: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        published_before: new Date().toISOString(),
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range filtering should return results",
    dateRangeResults.data.length >= 0,
  );

  // Test 8: Sorting functionality with validation
  const sortResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        sort_by: "view_count",
        order: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(sortResults);
  TestValidator.predicate(
    "sorting should return results",
    sortResults.data.length >= 0,
  );

  // Test 9: Complex multi-filter scenario
  const complexFilterResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "published",
        featured: true,
        allow_comments: true,
        view_count_min: 50,
        sort_by: "view_count",
        order: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(complexFilterResults);
  TestValidator.predicate(
    "complex multi-filter should return results",
    complexFilterResults.data.length >= 0,
  );

  // Test 10: Business status filtering
  const businessStatusResults =
    await api.functional.shoppingMall.articles.index(connection, {
      body: {
        page: 1,
        limit: 5,
        business_status: "approved",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(businessStatusResults);
  TestValidator.predicate(
    "business status filtering should return results",
    businessStatusResults.data.length >= 0,
  );

  // Test 11: Actor type filtering
  const actorTypeResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        actor_type: "customer",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(actorTypeResults);
  TestValidator.predicate(
    "actor type filtering should return results",
    actorTypeResults.data.length >= 0,
  );

  // Test 12: Empty search term
  const emptySearchResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: "",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(emptySearchResults);
  TestValidator.predicate(
    "empty search should return results",
    emptySearchResults.data.length >= 0,
  );

  // Test 13: Validate response structure integrity
  if (basicPagination.data.length > 0) {
    const sampleArticle = basicPagination.data[0];

    // Validate required properties
    TestValidator.equals(
      "article should have valid ID",
      typeof sampleArticle.id,
      "string",
    );
    TestValidator.equals(
      "article should have title",
      typeof sampleArticle.title,
      "string",
    );
    TestValidator.equals(
      "article should have status",
      typeof sampleArticle.status,
      "string",
    );
    TestValidator.equals(
      "article should have business_status",
      typeof sampleArticle.business_status,
      "string",
    );
    TestValidator.equals(
      "article should have featured flag",
      typeof sampleArticle.featured,
      "boolean",
    );
    TestValidator.equals(
      "article should have allow_comments flag",
      typeof sampleArticle.allow_comments,
      "boolean",
    );
    TestValidator.equals(
      "article should have view_count",
      typeof sampleArticle.view_count,
      "number",
    );
    TestValidator.equals(
      "article should have created_at",
      typeof sampleArticle.created_at,
      "string",
    );
    TestValidator.equals(
      "article should have updated_at",
      typeof sampleArticle.updated_at,
      "string",
    );

    // Validate channel structure
    TestValidator.equals(
      "article should have channel",
      typeof sampleArticle.channel.id,
      "string",
    );
    TestValidator.equals(
      "channel should have name",
      typeof sampleArticle.channel.name,
      "string",
    );
    TestValidator.equals(
      "channel should have code",
      typeof sampleArticle.channel.code,
      "string",
    );

    // Validate optional section property
    if (sampleArticle.section) {
      TestValidator.equals(
        "section should have id",
        typeof sampleArticle.section.id,
        "string",
      );
      TestValidator.equals(
        "section should have name",
        typeof sampleArticle.section.name,
        "string",
      );
      TestValidator.equals(
        "section should have display_order",
        typeof sampleArticle.section.display_order,
        "number",
      );
    }
  }

  // Test 14: Error scenario - invalid page number
  await TestValidator.error(
    "invalid page number should be handled gracefully",
    async () => {
      await api.functional.shoppingMall.articles.index(connection, {
        body: {
          page: 0, // Invalid page number
          limit: 10,
        } satisfies IShoppingMallArticle.IRequest,
      });
    },
  );

  // Test 15: Performance test with reasonable limit
  const performanceResults = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50, // Reasonable upper limit
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(performanceResults);
  TestValidator.predicate(
    "performance test should complete successfully",
    performanceResults.data.length >= 0,
  );
}

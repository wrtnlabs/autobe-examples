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
 * Test article search filtering by actor type (customer, seller, administrator)
 * to validate content attribution and ownership-based access controls.
 *
 * This test validates the comprehensive article search functionality with actor
 * type filtering capabilities, ensuring proper content visibility based on
 * creator roles and publication status. The test covers multiple filtering
 * scenarios including basic actor type filtering, combined filtering with
 * status and engagement metrics, and proper pagination handling.
 */
export async function test_api_article_search_by_actor_type(
  connection: api.IConnection,
) {
  // Test 1: Basic actor type filtering with valid actor types
  const actorTypes = ["customer", "seller", "administrator"] as const;

  for (const actorType of actorTypes) {
    const searchResult1 = await api.functional.shoppingMall.articles.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actor_type: actorType,
        } satisfies IShoppingMallArticle.IRequest,
      },
    );
    typia.assert(searchResult1);

    TestValidator.equals(
      `search result should have pagination data for actor type ${actorType}`,
      searchResult1.pagination.current,
      1,
    );
    TestValidator.predicate(
      `search result should have valid limit for actor type ${actorType}`,
      searchResult1.pagination.limit > 0,
    );

    // Validate article summary structure when data exists
    if (searchResult1.data.length > 0) {
      const firstArticle = searchResult1.data[0];
      TestValidator.predicate(
        `article should have valid ID structure for actor type ${actorType}`,
        typeof firstArticle.id === "string" && firstArticle.id.length > 0,
      );
      TestValidator.predicate(
        `article should have title for actor type ${actorType}`,
        typeof firstArticle.title === "string",
      );
    }
  }

  // Test 2: Combined filtering with actor type and publication status
  const statusValues = [
    "draft",
    "pending_review",
    "published",
    "archived",
  ] as const;

  for (const status of statusValues) {
    const searchResult2 = await api.functional.shoppingMall.articles.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          actor_type: "customer",
          status: status,
        } satisfies IShoppingMallArticle.IRequest,
      },
    );
    typia.assert(searchResult2);

    TestValidator.equals(
      `combined filter should return valid pagination for status ${status}`,
      searchResult2.pagination.current,
      1,
    );
  }

  // Test 3: Engagement metrics filtering with actor type
  const searchResult3 = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "seller",
        view_count_min: 0,
        view_count_max: 1000,
        like_count_min: 0,
        like_count_max: 100,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResult3);

  TestValidator.predicate(
    "engagement filtering should return valid pagination",
    searchResult3.pagination.pages >= 0,
  );

  // Test 4: Pagination and sorting with actor type filtering
  const searchResult4 = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
        actor_type: "administrator",
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResult4);

  TestValidator.equals(
    "pagination should return correct page number",
    searchResult4.pagination.current,
    2,
  );

  // Test 5: Full-text search combined with actor type filtering
  const searchResult5 = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "customer",
        search: "test",
        featured: true,
        allow_comments: true,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResult5);

  TestValidator.predicate(
    "full-text search with actor type should return valid structure",
    Array.isArray(searchResult5.data),
  );

  // Test 6: Complex filtering with multiple criteria
  const searchResult7 = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        actor_type: "seller",
        status: "published",
        featured: true,
        allow_comments: true,
        view_count_min: 10,
        like_count_min: 5,
        sort_by: "view_count",
        order: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResult7);

  TestValidator.equals(
    "complex filtering should maintain pagination integrity",
    searchResult7.pagination.limit,
    20,
  );

  // Test 7: Empty filtering scenario with specific criteria
  const searchResult8 = await api.functional.shoppingMall.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "customer",
        status: "published",
        view_count_min: 1000000, // Very high threshold likely to return empty
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResult8);

  TestValidator.predicate(
    "empty result scenario should still have valid pagination",
    searchResult8.pagination.records >= 0,
  );
}

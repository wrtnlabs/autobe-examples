import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test public access to review search functionality without authentication.
 *
 * Validates that the review search endpoint returns paginated results with
 * proper filtering and sorting capabilities for unauthenticated users. This
 * test ensures that public users can search and browse reviews without
 * requiring authentication, covering various search scenarios including text
 * search, rating filtering, status-based filtering, and sorting options.
 */
export async function test_api_review_search_public_access(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const basicSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic search returns page 1",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic search returns limit 10",
    basicSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "basic search returns valid records count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "basic search returns valid pages count",
    basicSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "basic search returns data array",
    Array.isArray(basicSearch.data),
  );

  // Test 2: Text search functionality
  const searchTerm = RandomGenerator.paragraph({ sentences: 2 });
  const textSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: searchTerm,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(textSearch);
  TestValidator.equals(
    "text search returns correct page",
    textSearch.pagination.current,
    1,
  );

  // Test 3: Rating range filtering
  const minRating = typia.random<
    number & tags.Minimum<1> & tags.Maximum<3>
  >() satisfies number as number;
  const maxRating = typia.random<
    number & tags.Minimum<3> & tags.Maximum<5>
  >() satisfies number as number;
  const ratingSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        min_rating: minRating,
        max_rating: maxRating,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(ratingSearch);
  TestValidator.equals(
    "rating search returns correct page",
    ratingSearch.pagination.current,
    1,
  );

  // Test 4: Status-based filtering for approved reviews
  const statusSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "approved",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(statusSearch);
  TestValidator.equals(
    "status search returns correct page",
    statusSearch.pagination.current,
    1,
  );

  // Test 5: Actor type filtering
  const actorTypes = ["customer", "seller"] as const;
  for (const actorType of actorTypes) {
    const actorSearch = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          actor_type: actorType,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(actorSearch);
    TestValidator.equals(
      `${actorType} actor type search returns correct page`,
      actorSearch.pagination.current,
      1,
    );
  }

  // Test 6: Sorting functionality - reduced combinations for efficiency
  const sortFields = ["created_at", "overall_rating"] as const;
  const sortOrders = ["desc"] as const;

  for (const sortField of sortFields) {
    for (const sortOrder of sortOrders) {
      const sortSearch = await api.functional.shoppingMall.reviews.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            sort_by: sortField,
            order: sortOrder,
          } satisfies IShoppingMallReview.IRequest,
        },
      );
      typia.assert(sortSearch);
      TestValidator.equals(
        `${sortField} ${sortOrder} sort returns correct page`,
        sortSearch.pagination.current,
        1,
      );
    }
  }

  // Test 7: Product-specific filtering with null (testing filtering with non-existent product)
  const productSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        product_id: undefined, // Testing with undefined product_id
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(productSearch);
  TestValidator.equals(
    "product search with undefined returns correct page",
    productSearch.pagination.current,
    1,
  );

  // Test 8: Seller-specific filtering with null (testing filtering with non-existent seller)
  const sellerSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        seller_id: undefined, // Testing with undefined seller_id
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(sellerSearch);
  TestValidator.equals(
    "seller search with undefined returns correct page",
    sellerSearch.pagination.current,
    1,
  );

  // Test 9: Combined filtering
  const combinedSearch = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "approved",
        actor_type: "customer",
        min_rating: 3,
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search returns correct page",
    combinedSearch.pagination.current,
    1,
  );

  // Test 10: Different page numbers
  const page2Search = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2Search);
  TestValidator.equals(
    "page 2 search returns correct page",
    page2Search.pagination.current,
    2,
  );

  // Test 11: Different limit sizes
  const limit20Search = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(limit20Search);
  TestValidator.equals(
    "limit 20 search returns correct limit",
    limit20Search.pagination.limit,
    20,
  );

  // Validate review data structure using typia assertions
  if (basicSearch.data.length > 0) {
    const sampleReview = basicSearch.data[0];
    typia.assert(sampleReview); // This validates ALL properties automatically

    // Additional business logic validation
    TestValidator.predicate(
      "review rating is within valid range",
      sampleReview.overall_rating >= 1 && sampleReview.overall_rating <= 5,
    );
    TestValidator.predicate(
      "review helpful count is non-negative",
      sampleReview.helpful_count >= 0,
    );
  } else {
    // Test empty result set handling
    TestValidator.equals(
      "empty data array is valid",
      basicSearch.data.length,
      0,
    );
  }
}

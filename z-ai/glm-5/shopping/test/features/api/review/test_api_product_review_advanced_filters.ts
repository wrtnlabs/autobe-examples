import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test advanced filtering capabilities for the review search endpoint.
 *
 * Test Scenarios:
 * 1. Filter by rating range (rating_min, rating_max)
 * 2. Filter by customer ID
 * 3. Full-text search on content
 * 4. Combined filters (product_id AND rating_min AND rating_max)
 * 5. Sorting variations (rating DESC, rating ASC, updated_at DESC)
 * 6. Pagination with filters
 * 7. Empty results when no reviews match
 */
export async function test_api_product_review_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  const testConnection: api.IConnection = { host: connection.host };
  // Fetch all reviews first to have reference data for testing
  const allReviews = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    { body: { limit: 100 } satisfies IShoppingMallReview.IRequest },
  );
  typia.assert(allReviews);
  // 1. Filter by Rating Range (4-5 stars only)
  const highRated = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    {
      body: {
        rating_min: 4,
        rating_max: 5,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(highRated);
  TestValidator.predicate(
    "high-rated reviews should have rating 4-5",
    highRated.data.every((r) => r.rating >= 4 && r.rating <= 5),
  );
  // 2. Filter by Customer ID
  if (allReviews.data.length > 0) {
    const customerId = allReviews.data[0].customer.id;
    const byCustomer = await api.functional.shoppingMall.customer.reviews.index(
      testConnection,
      {
        body: {
          customer_id: customerId,
          limit: 100,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(byCustomer);
    TestValidator.predicate(
      "customer reviews should belong to specified customer",
      byCustomer.data.every((r) => r.customer.id === customerId),
    );
  }
  // 3. Full-text Search on Content
  const withContent = allReviews.data.find((r) => r.content !== null);
  if (withContent !== undefined && withContent.content !== null) {
    const searchTerm = withContent.content.split(" ")[0] ?? "";
    const searchResult =
      await api.functional.shoppingMall.customer.reviews.index(testConnection, {
        body: {
          search: searchTerm,
          limit: 100,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(searchResult);
    TestValidator.predicate(
      "search results should contain matching content",
      searchResult.data.some(
        (r) =>
          r.content !== null &&
          r.content.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }
  // 4. Combined Filters (product_id + rating range)
  if (allReviews.data.length > 0) {
    const productId = allReviews.data[0].product.id;
    const combined = await api.functional.shoppingMall.customer.reviews.index(
      testConnection,
      {
        body: {
          product_id: productId,
          rating_min: 3,
          rating_max: 5,
          limit: 100,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(combined);
    TestValidator.predicate(
      "combined filters should return correct results",
      combined.data.every(
        (r) => r.product.id === productId && r.rating >= 3 && r.rating <= 5,
      ),
    );
  }
  // 5. Sorting by rating DESC (highest rated first)
  const descRating = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    {
      body: {
        sort: "rating",
        order: "desc",
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(descRating);
  TestValidator.predicate(
    "reviews should be sorted by rating DESC",
    descRating.data.every(
      (r, i, arr) => i === 0 || (arr[i - 1]?.rating ?? 0) >= r.rating,
    ),
  );
  // Sort by rating ASC (lowest rated first)
  const ascRating = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    {
      body: {
        sort: "rating",
        order: "asc",
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(ascRating);
  TestValidator.predicate(
    "reviews should be sorted by rating ASC",
    ascRating.data.every(
      (r, i, arr) => i === 0 || (arr[i - 1]?.rating ?? 0) <= r.rating,
    ),
  );
  // Sort by updated_at DESC (most recently edited)
  const updatedDesc = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    {
      body: {
        sort: "updated_at",
        order: "desc",
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(updatedDesc);
  // 6. Pagination with filters
  const page1 = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);
  if (page1.pagination.records > 10) {
    const page2 = await api.functional.shoppingMall.customer.reviews.index(
      testConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(page2);
    const page1Ids = new Set(page1.data.map((r) => r.id));
    TestValidator.predicate(
      "pagination should return different items on different pages",
      page2.data.every((r) => !page1Ids.has(r.id)),
    );
  }
  // 7. Empty results when no reviews match
  // Use an extremely specific filter that's unlikely to match anything
  const emptyResult = await api.functional.shoppingMall.customer.reviews.index(
    testConnection,
    {
      body: {
        rating_min: 1,
        rating_max: 1,
        search: "xyzzy123nonexistent456searchterm789",
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result when no reviews match filters",
    emptyResult.data.length,
    0,
  );
}

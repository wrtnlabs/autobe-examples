import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test review filtering capabilities by product ID and rating value.
 *
 * This test validates the comprehensive filtering functionality of the review
 * listing endpoint, including product-specific queries, rating-based filtering,
 * date range constraints, text search, and pagination with filtered results.
 */
export async function test_api_review_filtering_by_product_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create customer connection for authenticated requests
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Test productId filter with a valid UUID
  const productId = typia.random<string & tags.Format<"uuid">>();
  const productFilteredReviews =
    await api.functional.shoppingMall.reviews.index(customerConnection, {
      body: {
        productId: productId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(productFilteredReviews);
  TestValidator.predicate(
    "product filter returns valid response structure",
    Array.isArray(productFilteredReviews.data),
  );
  // 2. Test rating filter with value 5
  const rating5FilteredReviews =
    await api.functional.shoppingMall.reviews.index(customerConnection, {
      body: {
        rating: 5,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(rating5FilteredReviews);
  TestValidator.equals(
    "rating filter returns valid pagination",
    rating5FilteredReviews.pagination.current,
    1,
  );
  TestValidator.predicate(
    "rating filter response has correct structure",
    rating5FilteredReviews.data.every((r) => r.rating === 5),
  );
  // 3. Test combined filters: productId + rating
  const combinedFilteredReviews =
    await api.functional.shoppingMall.reviews.index(customerConnection, {
      body: {
        productId: productId,
        rating: 4,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(combinedFilteredReviews);
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilteredReviews.pagination.records >= 0,
  );
  // 4. Test date range filtering
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 24);
  const endDate = new Date();
  const dateFilteredReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(dateFilteredReviews);
  TestValidator.predicate(
    "date range filter returns valid response",
    dateFilteredReviews.pagination.current === 1,
  );
  // 5. Test text search filter with keyword
  const searchFilteredReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        search: "excellent",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(searchFilteredReviews);
  TestValidator.predicate(
    "text search returns valid response structure",
    Array.isArray(searchFilteredReviews.data),
  );
  // 6. Test pagination with filtered results
  const paginatedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paginatedReviews);
  TestValidator.equals(
    "pagination limit respected",
    paginatedReviews.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedReviews.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedReviews.data.length <= 5,
  );
  // 7. Test filtering by customerId
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const customerFilteredReviews =
    await api.functional.shoppingMall.reviews.index(customerConnection, {
      body: {
        customerId: customerId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(customerFilteredReviews);
  TestValidator.predicate(
    "customer filter returns valid response",
    customerFilteredReviews.pagination.pages >= 0,
  );
  // 8. Test all filters combined
  const allFiltersReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        customerId: customerId,
        rating: 5,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        search: "great",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(allFiltersReviews);
  TestValidator.equals(
    "all filters combined returns valid pagination",
    allFiltersReviews.pagination.current,
    1,
  );
  TestValidator.equals(
    "all filters combined respects limit",
    allFiltersReviews.pagination.limit,
    10,
  );
  // 9. Test different page number
  const page2Reviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2Reviews);
  TestValidator.equals(
    "page 2 returns correct current page",
    page2Reviews.pagination.current,
    2,
  );
  // 10. Test different rating values
  for (const rating of [1, 2, 3, 4, 5] as const) {
    const ratingFiltered = await api.functional.shoppingMall.reviews.index(
      customerConnection,
      {
        body: {
          rating: rating,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(ratingFiltered);
    TestValidator.equals(
      `rating ${rating} filter returns valid response`,
      ratingFiltered.pagination.current,
      1,
    );
  }
  // 11. Test limit boundary values
  const maxLimitReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(maxLimitReviews);
  TestValidator.equals(
    "max limit (100) is accepted",
    maxLimitReviews.pagination.limit,
    100,
  );
  const minLimitReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(minLimitReviews);
  TestValidator.equals(
    "min limit (1) is accepted",
    minLimitReviews.pagination.limit,
    1,
  );
  // 12. Verify response structure for returned reviews
  const structureTestReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(structureTestReviews);
  if (structureTestReviews.data.length > 0) {
    const firstReview = structureTestReviews.data[0];
    TestValidator.predicate(
      "review has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReview.id,
      ),
    );
    TestValidator.predicate(
      "review has valid rating (1-5)",
      firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    TestValidator.predicate(
      "review has valid customer",
      firstReview.customer.id !== undefined,
    );
    TestValidator.predicate(
      "review has valid orderItem",
      firstReview.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "review has valid created_at",
      firstReview.created_at !== undefined,
    );
    TestValidator.predicate(
      "review has valid updated_at",
      firstReview.updated_at !== undefined,
    );
  }
}

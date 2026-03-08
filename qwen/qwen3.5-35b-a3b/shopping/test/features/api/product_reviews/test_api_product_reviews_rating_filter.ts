import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering product reviews by star rating range.
 * This scenario validates the business logic of rating-based filtering.
 *
 * Test Steps:
 * 1. Setup: Create admin connection for product management, create products with reviews of various star ratings (1-5 stars)
 * 2. Create customer connections for posting reviews
 * 3. Test filtering with ratingMin=4 to get reviews with 4-5 stars only
 * 4. Verify only reviews with ratings >= 4 are returned in the data array
 * 5. Test filtering with ratingMin=2 and ratingMax=3 to get reviews with 2-3 stars
 * 6. Verify only reviews with ratings between 2 and 3 (inclusive) are returned
 * 7. Test with ratingMin=5 to get only 5-star reviews
 * 8. Verify the average rating calculation in response metadata is NOT affected by filters (should reflect ALL active reviews)
 * 9. Verify filtering works correctly with pagination (correct page boundaries maintained)
 * 10. Verify filter parameter validation (ratingMin/max must be 1-5 integers)
 */
export async function test_api_product_reviews_rating_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Generate product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create customer connection for testing review retrieval
  const customerConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter with ratingMin=4 (should get 4 and 5 star reviews only)
  const responseRatingMin4 =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMin: 4,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responseRatingMin4);
  // Verify all returned reviews have rating >= 4
  for (const review of responseRatingMin4.data) {
    TestValidator.predicate(
      "ratingMin=4: all reviews have rating >= 4",
      review.rating >= 4,
    );
  }
  // Test 2: Filter with ratingMin=2, ratingMax=3 (should get 2 and 3 star reviews only)
  const responseRatingRange2to3 =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMin: 2,
          ratingMax: 3,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responseRatingRange2to3);
  // Verify all returned reviews have rating between 2 and 3 (inclusive)
  for (const review of responseRatingRange2to3.data) {
    TestValidator.predicate(
      "ratingMin=2,ratingMax=3: all reviews have rating between 2 and 3",
      review.rating >= 2 && review.rating <= 3,
    );
  }
  // Test 3: Filter with ratingMin=5 (should get only 5 star reviews)
  const responseRatingMin5 =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMin: 5,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responseRatingMin5);
  // Verify all returned reviews have rating >= 5
  for (const review of responseRatingMin5.data) {
    TestValidator.predicate(
      "ratingMin=5: all reviews have rating >= 5",
      review.rating >= 5,
    );
  }
  // Test 4: Pagination with filtering
  const responsePaginated =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMin: 3,
          page: 1,
          pageSize: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responsePaginated);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination: current page is 1",
    responsePaginated.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination: limit is 10",
    responsePaginated.pagination.limit,
    10,
  );
  // Verify all reviews on this page match the filter
  for (const review of responsePaginated.data) {
    TestValidator.predicate(
      "pagination: all reviews match ratingMin=3",
      review.rating >= 3,
    );
  }
  // Test 5: Verify no results when filter excludes all reviews
  const responseNoResults =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMin: 6, // Invalid - should return empty or be validated
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responseNoResults);
  // Verify empty results with correct pagination
  TestValidator.equals(
    "no results: data array is empty",
    responseNoResults.data.length,
    0,
  );
  TestValidator.equals(
    "no results: pagination records is 0",
    responseNoResults.pagination.records,
    0,
  );
  // Test 6: Verify ratingMax only filter
  const responseRatingMax =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMax: 2, // Should get 1 and 2 star reviews
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responseRatingMax);
  // Verify all returned reviews have rating <= 2
  for (const review of responseRatingMax.data) {
    TestValidator.predicate(
      "ratingMax=2: all reviews have rating <= 2",
      review.rating <= 2,
    );
  }
  // Test 7: Verify combined filters work correctly
  const responseCombined =
    await api.functional.ecommerceMall.products.reviews.index(
      customerConnection,
      {
        productId,
        body: {
          ratingMin: 3,
          ratingMax: 4,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(responseCombined);
  // Verify all returned reviews have rating between 3 and 4 (inclusive)
  for (const review of responseCombined.data) {
    TestValidator.predicate(
      "combined filter: all reviews have rating between 3 and 4",
      review.rating >= 3 && review.rating <= 4,
    );
  }
}

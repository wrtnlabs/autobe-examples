import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test temporal filtering of buyer reviews using start_date and end_date
 * parameters.
 *
 * This test validates that the reviews API correctly accepts and processes date
 * range filter parameters (start_date and end_date). The test creates a buyer
 * account and queries reviews using various combinations of date filters to
 * ensure the API response structure is correct and the parameters are accepted
 * without errors.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a buyer account
 * 2. Query reviews with start_date filter only
 * 3. Query reviews with both start_date and end_date
 * 4. Query reviews with end_date filter only
 * 5. Test pagination with date filters
 * 6. Query without date filters as baseline
 * 7. Validate response structure for all queries
 */
export async function test_api_buyer_reviews_filtered_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Define date ranges for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Step 3: Query reviews with start_date filter only
  const reviewsFromSevenDaysAgo =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        start_date: sevenDaysAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsFromSevenDaysAgo);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be valid",
    reviewsFromSevenDaysAgo.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    reviewsFromSevenDaysAgo.pagination.limit === 20,
  );

  // Step 4: Query reviews with both start_date and end_date
  const reviewsInRange =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        start_date: thirtyDaysAgo.toISOString(),
        end_date: sevenDaysAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsInRange);

  // Validate response structure
  TestValidator.predicate(
    "response should have pagination object",
    reviewsInRange.pagination !== null &&
      reviewsInRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(reviewsInRange.data),
  );

  // Step 5: Query reviews with end_date filter only
  const reviewsUntilNow =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        end_date: tomorrow.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsUntilNow);

  // Step 6: Test pagination with date filters
  const paginatedReviews =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(paginatedReviews);

  TestValidator.predicate(
    "returned data should respect limit constraint",
    paginatedReviews.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    paginatedReviews.pagination.limit === 10,
  );

  // Step 7: Query without date filters to verify API works both ways
  const allReviews =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(allReviews);
}

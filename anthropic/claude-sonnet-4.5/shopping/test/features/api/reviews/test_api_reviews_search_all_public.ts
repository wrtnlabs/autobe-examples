import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public search and retrieval of product reviews without authentication.
 *
 * This test validates that unauthenticated users can browse approved reviews
 * across the marketplace. The operation returns paginated results with default
 * sorting by created_at descending. The test verifies:
 *
 * 1. Successful API call without authentication
 * 2. Pagination metadata correctness (current page, limit, total records, pages)
 * 3. Review summaries contain essential information:
 *
 *    - Star ratings
 *    - Review titles and content
 *    - Buyer information
 *    - Product references
 *    - Verification status
 *    - Helpfulness vote counts
 * 4. Only approved reviews are visible (pending_moderation and rejected filtered
 *    out)
 */
export async function test_api_reviews_search_all_public(
  connection: api.IConnection,
) {
  // Call the public review search API without authentication
  // Using minimal request parameters to get all approved reviews with default pagination
  const searchResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });

  // Validate the response structure
  typia.assert(searchResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);

  TestValidator.equals("page limit is 20", searchResult.pagination.limit, 20);

  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );

  // If there are reviews, validate their structure and content
  if (searchResult.data.length > 0) {
    for (const review of searchResult.data) {
      // Validate review has required properties
      TestValidator.predicate(
        "review has id",
        typeof review.id === "string" && review.id.length > 0,
      );

      TestValidator.predicate(
        "review has star rating between 1 and 5",
        review.star_rating >= 1 && review.star_rating <= 5,
      );

      TestValidator.predicate(
        "review status is approved",
        review.status === "approved",
      );

      TestValidator.predicate(
        "review has buyer information",
        review.buyer !== null && review.buyer !== undefined,
      );

      TestValidator.predicate(
        "review has sale information",
        review.sale !== null && review.sale !== undefined,
      );

      TestValidator.predicate(
        "review has verification status",
        typeof review.is_verified_purchase === "boolean",
      );

      TestValidator.predicate(
        "review has helpfulness vote count",
        typeof review.helpfulness_vote_count === "number" &&
          review.helpfulness_vote_count >= 0,
      );

      TestValidator.predicate(
        "review has created_at timestamp",
        typeof review.created_at === "string" && review.created_at.length > 0,
      );
    }

    // Validate sorting by created_at descending
    if (searchResult.data.length > 1) {
      for (let i = 0; i < searchResult.data.length - 1; i++) {
        const currentDate = new Date(searchResult.data[i].created_at);
        const nextDate = new Date(searchResult.data[i + 1].created_at);

        TestValidator.predicate(
          `reviews are sorted by created_at descending (index ${i})`,
          currentDate.getTime() >= nextDate.getTime(),
        );
      }
    }
  }

  // Test with different pagination parameters
  const page2Result: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });

  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );

  TestValidator.equals("page 2 limit is 10", page2Result.pagination.limit, 10);

  // Test with rating filter
  const highRatingResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1,
        limit: 20,
        min_rating: 4,
        max_rating: 5,
      } satisfies IShoppingMallReview.IRequest,
    });

  typia.assert(highRatingResult);

  // Validate all returned reviews have rating >= 4
  for (const review of highRatingResult.data) {
    TestValidator.predicate(
      "filtered review has rating >= 4",
      review.star_rating >= 4 && review.star_rating <= 5,
    );
  }

  // Test with verified purchase filter
  const verifiedResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1,
        limit: 20,
        verified_purchase_only: true,
      } satisfies IShoppingMallReview.IRequest,
    });

  typia.assert(verifiedResult);

  // Validate all returned reviews are verified purchases
  for (const review of verifiedResult.data) {
    TestValidator.equals(
      "filtered review is verified purchase",
      review.is_verified_purchase,
      true,
    );
  }
}

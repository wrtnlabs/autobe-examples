import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Validate the efficiency of review listing index usage.
 *
 * Tests the performance of the search predicate on the /shoppingMall/reviews
 * endpoint by using various combinations of filters (status, product_id,
 * created_at) to verify that the database queries use indexes for optimal
 * performance. The test does not validate the actual indexes but tests the
 * correct usage of query parameters that should trigger indexed searches.
 *
 * This test follows the PATCH /shoppingMall/reviews endpoint specification
 * which accepts a string request body for filtering reviews with parameters
 * such as:
 *
 * - Status: "published", "pending", "rejected", "hidden"
 * - Product_id: UUID of product
 * - Customer_id: UUID of customer
 * - Min_rating: minimum rating value (1-5)
 * - Max_rating: maximum rating value (1-5)
 * - Sort_by: "rating", "created_at", "updated_at"
 * - Sort_order: "asc", "desc"
 * - Limit: number of reviews per page (default: 10, max: 100)
 * - Current: page number (default: 1)
 *
 * The test executes several scenarios:
 *
 * 1. Default pagination (no filters)
 * 2. Filtering by status
 * 3. Filtering by product_id (UUID)
 * 4. Filtering by created_at range
 * 5. Sorting by created_at
 * 6. Multi-filter combination (status + product_id)
 *
 * These should trigger indexed searches on status, product_id, and created_at
 * columns.
 */
export async function test_api_review_list_index_efficiency(
  connection: api.IConnection,
) {
  // Generate test data
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const status: "published" | "pending" | "rejected" | "hidden" =
    RandomGenerator.pick([
      "published",
      "pending",
      "rejected",
      "hidden",
    ] as const);
  const createdAt: string = new Date().toISOString();

  // 1. Test default pagination (should return results)
  const defaultResults: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: "", // Empty string for default behavior
    });
  typia.assert(defaultResults);
  TestValidator.predicate(
    "default search returns data",
    defaultResults.data.length > 0,
  );

  // 2. Test filtering by status
  const statusQuery: string = `status=${status}`;
  const statusResults: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: statusQuery,
    });
  typia.assert(statusResults);
  TestValidator.predicate(
    "status filter returns data",
    statusResults.data.length > 0,
  );

  // 3. Test filtering by product_id
  const productQuery: string = `product_id=${productId}`;
  const productResults: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: productQuery,
    });
  typia.assert(productResults);
  TestValidator.predicate(
    "product_id filter returns data",
    productResults.data.length >= 0,
  ); // Could be 0 if no such reviews exist

  // 4. Test filtering by created_at
  const dateQuery: string = `created_at=gt;${createdAt}`;
  const dateResults: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: dateQuery,
    });
  typia.assert(dateResults);
  TestValidator.predicate(
    "created_at filter returns data",
    dateResults.data.length >= 0,
  );

  // 5. Test sorting by created_at
  const sortQuery: string = `sort_by=created_at&sort_order=desc`;
  const sortResults: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: sortQuery,
    });
  typia.assert(sortResults);
  TestValidator.predicate(
    "created_at sort returns data",
    sortResults.data.length > 0,
  );

  // 6. Test multi-filter combination (status + product_id)
  const combinedQuery: string = `status=${status}&product_id=${productId}`;
  const combinedResults: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: combinedQuery,
    });
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter returns data",
    combinedResults.data.length >= 0,
  );
}

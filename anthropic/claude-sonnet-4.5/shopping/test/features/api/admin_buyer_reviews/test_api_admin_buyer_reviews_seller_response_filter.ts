import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin filtering of buyer reviews by seller response status.
 *
 * This test validates that administrators can use the has_seller_response
 * parameter to filter buyer reviews, enabling them to identify reviews that
 * need seller attention or monitor seller engagement patterns.
 *
 * Note: Due to API limitations (no endpoints available to create buyers,
 * sellers, products, or reviews), this test validates the API's filtering
 * capability and response structure rather than end-to-end data flow.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Test has_seller_response: true filter
 * 3. Test has_seller_response: false filter
 * 4. Test filter combinations with other parameters
 * 5. Validate response structure and pagination
 */
export async function test_api_admin_buyer_reviews_seller_response_filter(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Generate a buyer ID for testing the filter functionality
  const buyerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test filtering for reviews WITH seller responses
  const reviewsWithResponse =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 20,
        has_seller_response: true,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsWithResponse);

  // Step 4: Validate response structure for reviews with seller responses
  TestValidator.predicate(
    "reviews with response have valid pagination object",
    reviewsWithResponse.pagination !== undefined &&
      reviewsWithResponse.pagination !== null,
  );
  TestValidator.predicate(
    "reviews with response have valid data array",
    Array.isArray(reviewsWithResponse.data),
  );
  TestValidator.predicate(
    "pagination has required fields",
    typeof reviewsWithResponse.pagination.current === "number" &&
      typeof reviewsWithResponse.pagination.limit === "number" &&
      typeof reviewsWithResponse.pagination.records === "number" &&
      typeof reviewsWithResponse.pagination.pages === "number",
  );

  // Step 5: Test filtering for reviews WITHOUT seller responses
  const reviewsWithoutResponse =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 20,
        has_seller_response: false,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsWithoutResponse);

  // Step 6: Validate response structure for reviews without seller responses
  TestValidator.predicate(
    "reviews without response have valid pagination object",
    reviewsWithoutResponse.pagination !== undefined &&
      reviewsWithoutResponse.pagination !== null,
  );
  TestValidator.predicate(
    "reviews without response have valid data array",
    Array.isArray(reviewsWithoutResponse.data),
  );

  // Step 7: Test has_seller_response filter with additional parameters
  const filteredReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 10,
        has_seller_response: true,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(filteredReviews);

  // Step 8: Validate combined filter results
  TestValidator.predicate(
    "combined filters return valid response structure",
    filteredReviews.pagination !== undefined &&
      Array.isArray(filteredReviews.data),
  );
  TestValidator.equals(
    "limit parameter is respected",
    filteredReviews.pagination.limit,
    10,
  );

  // Step 9: Test filter with different sort options
  const sortedReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 15,
        has_seller_response: false,
        sort_by: "rating",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortedReviews);

  // Step 10: Validate sorted results structure
  TestValidator.predicate(
    "sorted reviews have valid structure",
    sortedReviews.pagination !== undefined && Array.isArray(sortedReviews.data),
  );
  TestValidator.equals(
    "sort configuration is respected in limit",
    sortedReviews.pagination.limit,
    15,
  );
}

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
 * Test filtering reviews by verified purchase status to distinguish between
 * reviews from confirmed purchases and unverified reviews.
 *
 * This test validates the verified_purchase_only filter parameter by ensuring
 * that when set to true, only reviews with confirmed order verification are
 * returned. The test verifies that the is_verified_purchase field accurately
 * reflects purchase verification status and that filtering works correctly for
 * helping buyers understand which reviews carry verified purchase badges and
 * maintaining review credibility tracking.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Retrieve reviews with verified_purchase_only set to true
 * 3. Validate all returned reviews have is_verified_purchase as true
 * 4. Retrieve reviews with verified_purchase_only set to false
 * 5. Validate that unverified reviews may be included
 * 6. Test default behavior without the filter parameter
 */
export async function test_api_buyer_reviews_verified_purchase_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Test with verified_purchase_only set to true
  const verifiedOnlyRequest = {
    page: 1,
    limit: 20,
    buyer_id: buyer.id,
    verified_purchase_only: true,
  } satisfies IShoppingMallReview.IRequest;

  const verifiedOnlyResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: verifiedOnlyRequest,
    });
  typia.assert(verifiedOnlyResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "verified only response has valid pagination",
    verifiedOnlyResponse.pagination.current >= 1,
  );

  // Step 4: Validate all returned reviews are verified purchases
  if (verifiedOnlyResponse.data.length > 0) {
    verifiedOnlyResponse.data.forEach((review, index) => {
      TestValidator.predicate(
        `review ${index} is verified purchase`,
        review.is_verified_purchase === true,
      );
    });
  }

  // Step 5: Test with verified_purchase_only set to false
  const allReviewsRequest = {
    page: 1,
    limit: 20,
    buyer_id: buyer.id,
    verified_purchase_only: false,
  } satisfies IShoppingMallReview.IRequest;

  const allReviewsResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: allReviewsRequest,
    });
  typia.assert(allReviewsResponse);

  // Step 6: Validate all reviews response structure
  TestValidator.predicate(
    "all reviews response has valid pagination",
    allReviewsResponse.pagination.current >= 1,
  );

  // Step 7: Test default behavior without verified_purchase_only parameter
  const defaultRequest = {
    page: 1,
    limit: 20,
    buyer_id: buyer.id,
  } satisfies IShoppingMallReview.IRequest;

  const defaultResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: defaultRequest,
    });
  typia.assert(defaultResponse);

  // Step 8: Validate default response structure
  TestValidator.predicate(
    "default response has valid pagination",
    defaultResponse.pagination.current >= 1,
  );

  // Step 9: Verify is_verified_purchase field exists in all returned reviews
  [
    ...verifiedOnlyResponse.data,
    ...allReviewsResponse.data,
    ...defaultResponse.data,
  ].forEach((review, index) => {
    TestValidator.predicate(
      `review ${index} has is_verified_purchase field`,
      typeof review.is_verified_purchase === "boolean",
    );
  });
}

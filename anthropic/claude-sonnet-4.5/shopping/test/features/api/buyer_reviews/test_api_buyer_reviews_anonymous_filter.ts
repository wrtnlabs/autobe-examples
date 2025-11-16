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
 * Test filtering buyer reviews by anonymity status using the is_anonymous
 * parameter.
 *
 * This test validates that buyers can filter their review history to find
 * reviews submitted anonymously versus reviews with buyer attribution. The test
 * creates an authenticated buyer account and then retrieves reviews with
 * different is_anonymous filter values to ensure the filtering logic correctly
 * returns only matching reviews.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Retrieve all buyer reviews without anonymity filter (baseline)
 * 3. Filter reviews where is_anonymous = true (anonymous reviews only)
 * 4. Filter reviews where is_anonymous = false (attributed reviews only)
 * 5. Validate that filtered results contain only reviews matching the filter
 *    criteria
 */
export async function test_api_buyer_reviews_anonymous_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 2: Retrieve all reviews without anonymity filter (baseline)
  const allReviewsRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;

  const allReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: allReviewsRequest,
    });
  typia.assert(allReviews);

  // Step 3: Filter for anonymous reviews only (is_anonymous = true)
  const anonymousRequest = {
    page: 1,
    limit: 20,
    is_anonymous: true,
  } satisfies IShoppingMallReview.IRequest;

  const anonymousReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: anonymousRequest,
    });
  typia.assert(anonymousReviews);

  // Validate that all returned reviews are anonymous
  for (const review of anonymousReviews.data) {
    TestValidator.predicate(
      "anonymous filter: review should be anonymous",
      review.is_anonymous === true,
    );
  }

  // Step 4: Filter for attributed reviews only (is_anonymous = false)
  const attributedRequest = {
    page: 1,
    limit: 20,
    is_anonymous: false,
  } satisfies IShoppingMallReview.IRequest;

  const attributedReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: attributedRequest,
    });
  typia.assert(attributedReviews);

  // Validate that all returned reviews are NOT anonymous
  for (const review of attributedReviews.data) {
    TestValidator.predicate(
      "attributed filter: review should not be anonymous",
      review.is_anonymous === false,
    );
  }

  // Step 5: Validate total counts (anonymous + attributed should equal total when both exist)
  const totalAnonymousCount = anonymousReviews.pagination.records;
  const totalAttributedCount = attributedReviews.pagination.records;
  const allReviewsCount = allReviews.pagination.records;

  TestValidator.predicate(
    "total reviews should equal sum of anonymous and attributed reviews",
    totalAnonymousCount + totalAttributedCount === allReviewsCount,
  );
}

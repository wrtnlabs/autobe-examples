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
 * Test that an authenticated buyer can retrieve their complete review history.
 *
 * This test validates the basic review retrieval functionality for a buyer
 * account, ensuring that the buyer can access all reviews they have submitted
 * without applying any filters. The test verifies proper pagination metadata,
 * response structure, and essential review summary fields.
 *
 * Steps:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Retrieve all reviews for the buyer using default request parameters
 * 3. Validate the response structure with typia.assert
 * 4. Verify pagination behaves correctly for empty or populated results
 */
export async function test_api_buyer_reviews_retrieval_all_reviews(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
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

  // Step 2: Retrieve all reviews for the buyer with default parameters
  const reviewRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;

  const reviewsPage: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: reviewRequest,
    });
  typia.assert(reviewsPage);

  // Step 3: Validate business logic - pagination should be consistent
  TestValidator.equals(
    "current page matches requested page",
    reviewsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit matches requested limit",
    reviewsPage.pagination.limit,
    20,
  );

  // Step 4: Validate pagination consistency
  if (reviewsPage.pagination.records === 0) {
    TestValidator.equals(
      "empty results should have zero pages",
      reviewsPage.pagination.pages,
      0,
    );

    TestValidator.equals(
      "empty results should have empty data array",
      reviewsPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "non-empty results should have at least one page",
      reviewsPage.pagination.pages >= 1,
    );

    TestValidator.predicate(
      "data array should not exceed limit",
      reviewsPage.data.length <= reviewsPage.pagination.limit,
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function test_api_customer_review_list_rating_range_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering customer reviews by rating range to analyze satisfaction levels.
   *
   * This test validates that the review list endpoint correctly filters reviews
   * based on rating range parameters (ratingMin and ratingMax).
   */
  // 1. Customer authentication - create a customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Get all reviews for this customer (no filter) to establish baseline
  const allReviews = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(allReviews);
  // 3. Filter for high-satisfaction reviews (rating 4-5)
  const highSatisfaction =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 4,
          ratingMax: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(highSatisfaction);
  // Validate: All returned reviews should have rating 4 or 5
  TestValidator.predicate(
    "high satisfaction reviews have rating 4 or 5",
    highSatisfaction.data.every(
      (review) => review.rating >= 4 && review.rating <= 5,
    ),
  );
  // 4. Filter for low-satisfaction reviews (rating 1-2)
  const lowSatisfaction =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 1,
          ratingMax: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(lowSatisfaction);
  // Validate: All returned reviews should have rating 1 or 2
  TestValidator.predicate(
    "low satisfaction reviews have rating 1 or 2",
    lowSatisfaction.data.every(
      (review) => review.rating >= 1 && review.rating <= 2,
    ),
  );
  // 5. Filter for exact rating match (rating 3)
  const exactRating = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        ratingMin: 3,
        ratingMax: 3,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(exactRating);
  // Validate: All returned reviews should have rating exactly 3
  TestValidator.predicate(
    "exact rating filter returns only rating 3 reviews",
    exactRating.data.every((review) => review.rating === 3),
  );
  // 6. Verify pagination metadata reflects filtered counts
  // High satisfaction pagination should match its data count
  TestValidator.equals(
    "high satisfaction pagination records",
    highSatisfaction.pagination.records,
    highSatisfaction.data.length,
  );
  // Low satisfaction pagination should match its data count
  TestValidator.equals(
    "low satisfaction pagination records",
    lowSatisfaction.pagination.records,
    lowSatisfaction.data.length,
  );
  // Exact rating pagination should match its data count
  TestValidator.equals(
    "exact rating pagination records",
    exactRating.pagination.records,
    exactRating.data.length,
  );
  // 7. Verify total count relationship
  // Sum of all filtered counts should not exceed total
  const sumOfFiltered =
    highSatisfaction.pagination.records +
    lowSatisfaction.pagination.records +
    exactRating.pagination.records;
  TestValidator.predicate(
    "sum of filtered results does not exceed total",
    sumOfFiltered <= allReviews.pagination.records,
  );
}

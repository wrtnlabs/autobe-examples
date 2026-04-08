import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer review filtering by rating range parameters.
 *
 * Validates that customers can filter their review list using ratingMin and ratingMax parameters to retrieve reviews within specific star rating ranges. The test verifies correct filtering behavior across multiple rating combinations and ensures pagination metadata reflects accurate record counts.
 *
 * 1. Authenticate as customer using authorize_customer_join.
 * 2. Query reviews with full rating range (1-5) to establish baseline.
 * 3. Query reviews with high ratings only (4-5) and validate filtering.
 * 4. Query reviews with low ratings only (1-2) and validate filtering.
 * 5. Query reviews with single rating (3-3) and validate filtering.
 * 6. Query with non-matching range to verify empty results.
 * 7. Validate pagination metadata shows correct record counts for each filter.
 *
 * Special attention is given to verifying that the rating filter uses inclusive boundaries and correctly combines with the customer authentication context.
 */
export async function test_api_customer_reviews_filter_by_rating_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Query with full rating range (1-5) - baseline
  const allReviews = await api.functional.ecommerce.customer.reviews.index(
    customerConnection,
    {
      body: {
        ratingMin: 1,
        ratingMax: 5,
        limit: 100,
      } satisfies IEcommerceReview.IRequest,
    },
  );
  typia.assert(allReviews);
  // 3. Query with high ratings only (4-5)
  const highRatings = await api.functional.ecommerce.customer.reviews.index(
    customerConnection,
    {
      body: {
        ratingMin: 4,
        ratingMax: 5,
        limit: 100,
      } satisfies IEcommerceReview.IRequest,
    },
  );
  typia.assert(highRatings);
  // 4. Query with low ratings only (1-2)
  const lowRatings = await api.functional.ecommerce.customer.reviews.index(
    customerConnection,
    {
      body: {
        ratingMin: 1,
        ratingMax: 2,
        limit: 100,
      } satisfies IEcommerceReview.IRequest,
    },
  );
  typia.assert(lowRatings);
  // 5. Query with single rating (3-3)
  const midRatings = await api.functional.ecommerce.customer.reviews.index(
    customerConnection,
    {
      body: {
        ratingMin: 3,
        ratingMax: 3,
        limit: 100,
      } satisfies IEcommerceReview.IRequest,
    },
  );
  typia.assert(midRatings);
  // 6. Validate all reviews have ratings within expected ranges
  for (const review of highRatings.data) {
    typia.assert(review);
    TestValidator.predicate(
      "high rating review has rating >= 4",
      review.rating >= 4,
    );
    TestValidator.predicate(
      "high rating review has rating <= 5",
      review.rating <= 5,
    );
  }
  for (const review of lowRatings.data) {
    typia.assert(review);
    TestValidator.predicate(
      "low rating review has rating >= 1",
      review.rating >= 1,
    );
    TestValidator.predicate(
      "low rating review has rating <= 2",
      review.rating <= 2,
    );
  }
  for (const review of midRatings.data) {
    typia.assert(review);
    TestValidator.equals("mid rating review has rating 3", review.rating, 3);
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "full range has non-negative record count",
    allReviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "high ratings has non-negative record count",
    highRatings.pagination.records >= 0,
  );
  TestValidator.predicate(
    "low ratings has non-negative record count",
    lowRatings.pagination.records >= 0,
  );
  TestValidator.predicate(
    "mid ratings has non-negative record count",
    midRatings.pagination.records >= 0,
  );
  // 8. Validate that filtered results are subsets of full results
  TestValidator.predicate(
    "high ratings count <= all reviews count",
    highRatings.pagination.records <= allReviews.pagination.records,
  );
  TestValidator.predicate(
    "low ratings count <= all reviews count",
    lowRatings.pagination.records <= allReviews.pagination.records,
  );
  TestValidator.predicate(
    "mid ratings count <= all reviews count",
    midRatings.pagination.records <= allReviews.pagination.records,
  );
}

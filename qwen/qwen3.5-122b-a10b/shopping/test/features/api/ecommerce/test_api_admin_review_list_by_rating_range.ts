import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator review filtering by rating range functionality.
 *
 * Validates that administrators can filter customer reviews by rating range using ratingMin and ratingMax parameters. The test ensures that only reviews within the specified rating bounds are returned, and that the filtering works correctly across various scenarios.
 *
 * This test covers the admin oversight capability to identify reviews within specific satisfaction levels, which is useful for quality monitoring and customer service investigations.
 *
 * 1. Administrator authenticates with the system.
 * 2. Test filtering with ratingMin=1, ratingMax=2 (low ratings).
 * 3. Test filtering with ratingMin=3, ratingMax=5 (high ratings).
 * 4. Test filtering with exact rating match (ratingMin=4, ratingMax=4).
 * 5. Test filtering without rating constraints (all reviews).
 * 6. Validate all returned reviews match the rating filter criteria.
 * 7. Validate pagination structure is correct.
 * 8. Test invalid rating ranges trigger validation errors.
 */
export async function test_api_admin_review_list_by_rating_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      reason: "System testing for review filtering functionality",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering with rating range 1-2 (low ratings)
  const lowRatingResponse =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        ratingMin: 1,
        ratingMax: 2,
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(lowRatingResponse);
  // Validate all reviews in response have rating between 1 and 2
  for (const review of lowRatingResponse.data) {
    TestValidator.predicate(
      "low rating filter: review rating >= 1",
      review.rating >= 1,
    );
    TestValidator.predicate(
      "low rating filter: review rating <= 2",
      review.rating <= 2,
    );
  }
  // 3. Test filtering with rating range 3-5 (high ratings)
  const highRatingResponse =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        ratingMin: 3,
        ratingMax: 5,
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(highRatingResponse);
  // Validate all reviews in response have rating between 3 and 5
  for (const review of highRatingResponse.data) {
    TestValidator.predicate(
      "high rating filter: review rating >= 3",
      review.rating >= 3,
    );
    TestValidator.predicate(
      "high rating filter: review rating <= 5",
      review.rating <= 5,
    );
  }
  // 4. Test filtering with exact rating match (4 stars only)
  const exactRatingResponse =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        ratingMin: 4,
        ratingMax: 4,
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(exactRatingResponse);
  // Validate all reviews in response have rating exactly 4
  for (const review of exactRatingResponse.data) {
    TestValidator.equals(
      "exact rating filter: review rating is 4",
      review.rating,
      4,
    );
  }
  // 5. Test filtering without rating constraints (all reviews)
  const allReviewsResponse =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(allReviewsResponse);
  // Validate all reviews have valid rating (1-5)
  for (const review of allReviewsResponse.data) {
    TestValidator.predicate(
      "all reviews: rating is valid (1-5)",
      review.rating >= 1 && review.rating <= 5,
    );
  }
  // 6. Validate pagination structure for all responses
  const validatePagination = (pagination: IPage.IPagination, title: string) => {
    TestValidator.predicate(`${title}: current >= 0`, pagination.current >= 0);
    TestValidator.predicate(`${title}: limit >= 0`, pagination.limit >= 0);
    TestValidator.predicate(`${title}: records >= 0`, pagination.records >= 0);
    TestValidator.predicate(`${title}: pages >= 0`, pagination.pages >= 0);
    TestValidator.predicate(
      `${title}: pages calculated correctly`,
      pagination.limit > 0
        ? pagination.pages === Math.ceil(pagination.records / pagination.limit)
        : pagination.pages === 0,
    );
  };
  validatePagination(lowRatingResponse.pagination, "low rating pagination");
  validatePagination(highRatingResponse.pagination, "high rating pagination");
  validatePagination(exactRatingResponse.pagination, "exact rating pagination");
  validatePagination(allReviewsResponse.pagination, "all reviews pagination");
  // 7. Test invalid rating range (ratingMin > ratingMax) - should be handled by validation
  await TestValidator.error("invalid rating range: min > max", async () => {
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        ratingMin: 4,
        ratingMax: 2,
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  });
  // 8. Test invalid rating value (outside 1-5 range) - should be handled by validation
  await TestValidator.error("invalid rating value: below minimum", async () => {
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        ratingMin: 0,
        ratingMax: 5,
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  });
  await TestValidator.error("invalid rating value: above maximum", async () => {
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        ratingMin: 1,
        ratingMax: 6,
        limit: 20,
      } satisfies IEcommerceReview.IRequest,
    });
  });
}

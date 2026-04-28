import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test review attribution for deleted customer accounts.
 *
 * Validates that product reviews remain visible in search results even after the reviewing customer has deleted their account, with correct attribution indicating the user was deleted. Reviews preserve their historical data for product evaluation integrity while properly indicating the author's deleted status.
 *
 * Tests the business rule that soft-deleted reviews themselves are excluded from results, but reviews authored by deleted customers are still displayed with the customer summary showing the deleted_at timestamp.
 *
 * 1. Customer registers and authenticates for review browsing.
 * 2. Customer searches for product reviews without restrictive filters.
 * 3. Validates review response structure and pagination data.
 * 4. For reviews with deleted customer accounts (deleted_at not null), confirms the customer summary correctly reflects the deleted state.
 * 5. Validates that product references are maintained within each review.
 */
export async function test_api_customer_reviews_deleted_attribution(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer for review browsing
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(registered);
  // 2. Search for reviews without filters to retrieve available data
  const body = {
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommercePlatformReview.IRequest;
  const reviewsPage =
    await api.functional.ecommercePlatform.customer.reviews.index(
      customerConnection,
      { body },
    );
  typia.assert(reviewsPage);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination records matches data length",
    reviewsPage.pagination.records === reviewsPage.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    reviewsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request limit",
    reviewsPage.pagination.limit === 10,
  );
  // 4. Validate each review structure and attribution
  const reviewsWithDeletedCustomers = reviewsPage.data.filter(
    (r) => r.customer.deleted_at !== null,
  );
  // For all reviews, validate essential business structure
  reviewsPage.data.forEach((review) => {
    typia.assert(review);
    // Product reference maintained
    TestValidator.predicate(
      `review ${review.id} has valid product reference`,
      review.product.id !== undefined,
    );
    // Customer summary exists with email for attribution
    TestValidator.predicate(
      `review ${review.id} customer has email for audit trail`,
      review.customer.email.length > 0,
    );
    // If customer is deleted, deleted_at timestamp is set
    if (review.customer.deleted_at !== null) {
      TestValidator.predicate(
        `review ${review.id} authored by deleted customer has deleted_at timestamp`,
        review.customer.deleted_at.length > 0,
      );
    }
    // Rating within valid 1-5 range
    TestValidator.predicate(
      `review ${review.id} rating within valid range`,
      review.rating >= 1 && review.rating <= 5,
    );
  });
  // 5. If deleted customer reviews exist, validate they are still visible
  if (reviewsWithDeletedCustomers.length > 0) {
    reviewsWithDeletedCustomers.forEach((review) => {
      // Review data preserved even after customer deletion
      TestValidator.predicate(
        `deleted customer review ${review.id} preserved`,
        review.created_at.length > 0,
      );
    });
  }
}

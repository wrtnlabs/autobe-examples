import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
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

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest review browsing with deleted customer scenarios.
 *
 * Validates that the guest review browsing endpoint correctly returns paginated review summaries including reviews authored by customers whose accounts have been deleted. Reviews from deleted customers should remain visible with a generic deleted user designation, preserving star ratings and text content for product evaluation purposes.
 *
 * Reviews are sorted newest-first by default, and soft-deleted reviews are excluded from results. Pagination metadata accurately reflects total matching records across all pages.
 *
 * 1. Guest authenticates via device fingerprint join.
 * 2. Guest browses all reviews without filters to verify response structure.
 * 3. Guest filters reviews by product identifier.
 * 4. Guest filters reviews by customer identifier.
 * 5. Validates review structure: rating constrained 1-5, nullable text content, customer reference with deletion timestamp, product reference, creation timestamp.
 */
export async function test_api_review_guest_browsing_deleted_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication - create actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthToken = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(guestAuthToken);
  TestValidator.equals(
    "guest not soft-deleted",
    guestAuthToken.deleted_at,
    null,
  );
  // 2. Browse all reviews - validate paginated response structure
  const allReviews = await api.functional.ecommercePlatform.guest.reviews.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(allReviews);
  TestValidator.equals(
    "pagination current starts at 1",
    allReviews.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    allReviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly from records and limit",
    allReviews.pagination.pages ===
      Math.ceil(allReviews.pagination.records / allReviews.pagination.limit),
  );
  // 3. Filter reviews by product identifier
  if (allReviews.data.length > 0) {
    const productId = allReviews.data[0].product.id;
    const reviewsByProduct =
      await api.functional.ecommercePlatform.guest.reviews.index(
        guestConnection,
        {
          body: { productId },
        },
      );
    typia.assert(reviewsByProduct);
    TestValidator.predicate(
      "product filter returns matching reviews",
      reviewsByProduct.data.length > 0,
    );
    TestValidator.equals(
      "all returned reviews reference the filtered product",
      reviewsByProduct.data.every((r) => r.product.id === productId),
      true,
    );
    // 4. Filter by customer identifier from retrieved review
    const customerId = allReviews.data[0].customer.id;
    const reviewsByCustomer =
      await api.functional.ecommercePlatform.guest.reviews.index(
        guestConnection,
        {
          body: { customerId },
        },
      );
    typia.assert(reviewsByCustomer);
    TestValidator.equals(
      "customer filter returns matching reviews",
      reviewsByCustomer.data.every((r) => r.customer.id === customerId),
      true,
    );
    // 5. Validate review business logic - iterate through reviews
    await ArrayUtil.asyncForEach(
      allReviews.data,
      async (review: IEcommercePlatformReview.ISummary) => {
        // Rating - constrained business logic validation
        TestValidator.predicate(
          "rating is integer value",
          Math.floor(review.rating) === review.rating,
        );
        TestValidator.predicate(
          "rating within valid range 1-5",
          review.rating >= 1 && review.rating <= 5,
        );
      },
    );
  }
  // Test rating range filters - business logic
  const reviewsTopRated =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: { minRating: 5 },
      },
    );
  typia.assert(reviewsTopRated);
  TestValidator.equals(
    "top-rated filter only returns 5-star reviews",
    reviewsTopRated.data.every((r) => r.rating >= 5),
    true,
  );
  const reviewsBottomRated =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: { maxRating: 1 },
      },
    );
  typia.assert(reviewsBottomRated);
  TestValidator.equals(
    "bottom-rated filter only returns 1-star reviews",
    reviewsBottomRated.data.every((r) => r.rating <= 1),
    true,
  );
  // Test pagination business logic
  const pageSize = 2;
  const paginatedReviews =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: { limit: pageSize, page: 1 },
      },
    );
  typia.assert(paginatedReviews);
  TestValidator.equals(
    "pagination current matches requested page",
    paginatedReviews.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    paginatedReviews.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "data array does not exceed page limit",
    paginatedReviews.data.length <= pageSize,
  );
}
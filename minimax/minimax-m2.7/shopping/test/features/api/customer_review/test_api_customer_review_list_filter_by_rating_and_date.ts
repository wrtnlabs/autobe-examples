import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_list_filter_by_rating_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Get the customer ID from the authorized response
  const customerId = customer.id;
  // 3. Define date range for filtering (last 30 days to tomorrow)
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  // 4. Test filtering by rating range (4-5 stars) and date range
  // This tests the core functionality: filtering reviews by ratingMin, ratingMax, createdAfter, createdBefore
  const filteredResponse =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 4 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          ratingMax: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          createdAfter: thirtyDaysAgo satisfies string &
            tags.Format<"date-time">,
          createdBefore: tomorrow satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(filteredResponse);
  // 5. Validate the response structure
  TestValidator.equals(
    "response has pagination metadata",
    filteredResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has required fields",
    typeof filteredResponse.pagination.current === "number" &&
      typeof filteredResponse.pagination.limit === "number" &&
      typeof filteredResponse.pagination.records === "number" &&
      typeof filteredResponse.pagination.pages === "number",
    true,
  );
  TestValidator.equals(
    "data is an array",
    Array.isArray(filteredResponse.data),
    true,
  );
  // 6. Validate that all returned reviews satisfy the rating filter (4-5 stars)
  TestValidator.predicate(
    "all ratings between 4-5 when rating filter applied",
    () =>
      filteredResponse.data.every(
        (review) => review.rating >= 4 && review.rating <= 5,
      ),
  );
  // 7. Validate that all returned reviews satisfy the date filter
  TestValidator.predicate(
    "all reviews within date range when date filter applied",
    () =>
      filteredResponse.data.every((review) => {
        const reviewDate = new Date(review.created_at);
        return (
          reviewDate >= new Date(thirtyDaysAgo) &&
          reviewDate <= new Date(tomorrow)
        );
      }),
  );
  // 8. Test with a different rating filter range (1-2 stars - low ratings)
  const lowRatingResponse =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          ratingMax: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          createdAfter: thirtyDaysAgo satisfies string &
            tags.Format<"date-time">,
          createdBefore: tomorrow satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(lowRatingResponse);
  // 9. Validate low rating filter
  TestValidator.predicate(
    "all ratings between 1-2 when low rating filter applied",
    () =>
      lowRatingResponse.data.every(
        (review) => review.rating >= 1 && review.rating <= 2,
      ),
  );
  // 10. Test pagination reflects filtered count
  TestValidator.predicate(
    "pagination records reflects filtered data count",
    () =>
      lowRatingResponse.pagination.records === lowRatingResponse.data.length,
  );
  // 11. Test with no filters - should return all customer reviews
  const allReviewsResponse =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(allReviewsResponse);
  TestValidator.equals(
    "all reviews response has valid pagination",
    allReviewsResponse.pagination !== null &&
      allReviewsResponse.pagination.pages >= 0,
    true,
  );
}

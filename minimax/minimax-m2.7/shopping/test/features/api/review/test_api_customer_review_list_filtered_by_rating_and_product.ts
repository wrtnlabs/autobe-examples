import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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

export async function test_api_customer_review_list_filtered_by_rating_and_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer for testing
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a filtered review request with rating range 4-5 stars
  const requestBody = {
    minRating: 4 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    maxRating: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceMallReview.IRequest;
  // 3. Call the filtered review listing endpoint
  const filteredReviews =
    await api.functional.ecommerceMall.customer.customers.me.reviews.index(
      customerConnection,
      { body: requestBody },
    );
  // 4. Validate response structure
  typia.assert(filteredReviews);
  TestValidator.equals(
    "pagination exists",
    filteredReviews.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(filteredReviews.data),
    true,
  );
  // 5. Validate all returned reviews have rating within the specified range
  for (const review of filteredReviews.data) {
    TestValidator.predicate(
      `review rating ${review.rating} is between min (4) and max (5)`,
      review.rating >= 4 && review.rating <= 5,
    );
  }
  // 6. Test filtering by product ID (using a non-existent product ID for empty result)
  const targetProductId = typia.random<string & tags.Format<"uuid">>();
  const productFilteredRequest = {
    productId: targetProductId,
    minRating: 4 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    maxRating: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
  } satisfies IEcommerceMallReview.IRequest;
  const productFilteredReviews =
    await api.functional.ecommerceMall.customer.customers.me.reviews.index(
      customerConnection,
      { body: productFilteredRequest },
    );
  // 7. Validate product filter works (empty or matching results)
  typia.assert(productFilteredReviews);
  TestValidator.equals(
    "data is array",
    Array.isArray(productFilteredReviews.data),
    true,
  );
  // 8. If reviews exist, validate they belong to the specified product and rating range
  for (const item of productFilteredReviews.data) {
    TestValidator.equals(
      `review belongs to product ${targetProductId}`,
      item.product.id,
      targetProductId,
    );
    TestValidator.predicate(
      `review rating ${item.rating} is between 4 and 5`,
      item.rating >= 4 && item.rating <= 5,
    );
  }
  // 9. Test combined filters with full range
  const combinedRequest = {
    minRating: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    maxRating: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceMallReview.IRequest;
  const combinedReviews =
    await api.functional.ecommerceMall.customer.customers.me.reviews.index(
      customerConnection,
      { body: combinedRequest },
    );
  // 10. Validate pagination metadata accuracy
  typia.assert(combinedReviews);
  TestValidator.predicate(
    "current page is valid",
    combinedReviews.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    combinedReviews.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    combinedReviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    combinedReviews.pagination.pages >= 0,
  );
}

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

export async function test_api_customer_review_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Call reviews list API with default pagination (newest first, page 1, limit 10)
  const reviewsResponse =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {
          sortBy: "newest",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewsResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination metadata",
    reviewsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    reviewsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", reviewsResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    reviewsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    reviewsResponse.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.equals(
    "has data array",
    Array.isArray(reviewsResponse.data),
    true,
  );
  // 5. If multiple reviews exist, validate sorting (newest first by created_at descending)
  if (reviewsResponse.data.length > 1) {
    for (let i = 0; i < reviewsResponse.data.length - 1; i++) {
      const currentDate = new Date(
        reviewsResponse.data[i].created_at,
      ).getTime();
      const nextDate = new Date(
        reviewsResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `review at index ${i} is newer than review at index ${i + 1}`,
        currentDate >= nextDate,
      );
    }
  }
  // 6. Validate review summary structure for each item
  for (const review of reviewsResponse.data) {
    TestValidator.predicate("review has valid id", !!review.id);
    TestValidator.predicate(
      "rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has created_at timestamp",
      !!review.created_at,
    );
    TestValidator.predicate("review has customer reference", !!review.customer);
    TestValidator.predicate("review has product reference", !!review.product);
  }
}
